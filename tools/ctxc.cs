// -*- coding:utf-8 -*-
using Rgx=System.Text.RegularExpressions;
using Gen=System.Collections.Generic;

public class FileInfo{
	public string filename=null;
	public Gen::List<string> mwg_waits=new System.Collections.Generic.List<string>();

	public string GetMwgScriptsRequirement(){
		System.Text.StringBuilder build=new System.Text.StringBuilder();
		foreach(string file in mwg_waits){
			build.Append(",\"");
			build.Append(file);
			build.Append("\"");
		}
		return build.ToString();
	}
}

public class ProgramArgs{
  public bool option_compress=false;

  /// 2013-08-31, KM,
  ///   現在の処理が command/letter/environment/context のみの処理である事を表す。
  ///   agh.register() でスクリプト全体を囲んだり、#include などを展開したりなどの操作は行わない。
  ///   また、変換方法も新しい方法で行う物とする。
  public bool option_partial=false;

  public string option_filename=null;
}

public static class Program{
  static ProgramArgs _args=new ProgramArgs();

	public static void Main(string[] args){
		InitConsole();

		string srcfile=checkArgument(args);
		if(srcfile==null)return;

		FileInfo info=new FileInfo();
		info.filename=_args.option_filename??srcfile;
		System.Console.WriteLine("file '{0}' を処理します",srcfile);
		string content=System.IO.File.ReadAllText(srcfile,enc);

		content=Preprocessor.Process(content,info);
    content=RegExp.JsConvertAtStrings(content); // @"" @'' の処理
		content=TranslateContext.Translate(_args,content);
		if(_args.option_compress)
			content=RegExp.CutComment(content);
		else
			content=RegExp.CanonicalizeLine(content);

    if(!_args.option_partial){
      content=string.Format(
        FRAME,
        info.filename,
        enc.WebName,
        System.DateTime.Now,
        srcfile,
        content,
        info.GetMwgScriptsRequirement()
      );
    }
		System.IO.File.WriteAllText(info.filename+".js",content);

		System.Console.WriteLine("file '{0}.js' に書き込みました",info.filename);
	}

	public static void InitConsole(){
		string envLang=System.Environment.GetEnvironmentVariable("LANG");
		if(envLang!=null){
			envLang=envLang.ToUpper();
			if(envLang.EndsWith(".UTF-8")){
				System.Console.OutputEncoding=System.Text.Encoding.UTF8;
			}else if(envLang.EndsWith(".EUCJP")){
				System.Console.OutputEncoding=System.Text.Encoding.GetEncoding(20932);
			}
		}
	}

	public static string checkArgument(string[] args){
		string file=null;
		foreach(string str in args){
			if(str[0]=='/'||str[0]=='-'){
				switch(str[1]){
        case 'c':
        case 'C':
          _args.option_compress=true;
          break;
        case 'p':
          _args.option_partial=true;
          break;
        case 'o':
          {
            string fname=str.Substring(2);
            if(fname.EndsWith(".js"))
              fname=fname.Substring(0,fname.Length-3);
            if(fname.Length>0)
              _args.option_filename=fname;
          }
          break;
				}
			}else{
				file=str;
				continue;
			}
		}

		// file 引数の検査
		if(file==null){
			System.Console.WriteLine("引数には file 名を指定して下さい。");
			WriteUsage();
			return null;
		}
		if(System.IO.File.Exists(file))return file;
		System.Console.WriteLine("file '{0}' は存在しません。",file);

		file+=".ctx";
		if(System.IO.File.Exists(file))return file;
		System.Console.WriteLine("file '{0}' は存在しません。",file);

		WriteUsage();
		return null;
	}
	static void WriteUsage(){
		System.Console.WriteLine("-------------------------------------");
		System.Console.WriteLine("使い方 (syntax):\r\n\tctxc <filename>");
		System.Console.WriteLine("-------------------------------------");
		System.Console.Write("Press any key to exit...");
		System.Console.Read();
	}

	public static System.Text.Encoding enc=System.Text.Encoding.UTF8;

	public static readonly string FRAME;
	static Program(){
		System.Reflection.Assembly asm=System.Reflection.Assembly.GetExecutingAssembly();
		System.IO.Stream str=asm.GetManifestResourceStream("ctxc.frame.js");
		System.IO.StreamReader sr=new System.IO.StreamReader(str,System.Text.Encoding.UTF8);
		FRAME=sr.ReadToEnd();
	}
}

public static class Preprocessor{
	const string rex_quotedstr	=@"""(?:[^""\\]|\\.)*""|'(?:[^'\\]|\\.)*'";
	const string rex_output		=@"^\s*\#(?<name>output)\s+(?<filename>"+rex_quotedstr+@")\s*$";
	const string rex_include	=@"^\s*\#(?<name>include)\s+(?<filename>"+rex_quotedstr+@")\s*$";
	const string rex_debug0		=@"^\s*\/\/\#(?<name>debug)\s+0[\s\S]+?^\s*\/\/\#end\s+debug";

	// 20101121
	const string rex_mwgwait		=@"^\s*\#(?<name>mwgwait)\s+(?<filename>"+rex_quotedstr+@")\s*$";

	const string rex_preproc	=@"(?:"+rex_output+@"|"+rex_include+@"|"+rex_debug0+@"|"+rex_mwgwait+@")";

	//static Rgx::Regex reg_output=new Rgx::Regex(rex_output,Rgx::RegexOptions.Multiline);
	//static Rgx::Regex reg_include=new Rgx::Regex(rex_include,Rgx::RegexOptions.Multiline);
	static Rgx::Regex reg_preproc=new Rgx::Regex(rex_preproc,Rgx::RegexOptions.Multiline);
	public static string Process(string content,FileInfo info){
		string _filename=info.filename;
		content=reg_preproc.Replace(content,delegate(Rgx::Match m){
			switch(m.Groups["name"].Value){
				case "output":{
					string fn=StringFromLiteral(m.Groups["filename"].Value).ToLower();
					if(fn.EndsWith(".js"))fn=fn.Substring(0,fn.Length-3);
					if(fn!=null)_filename=fn;
					return "";
				}
				case "include":{
					// 読み取るファイル名
					string incfile=StringFromLiteral(m.Groups["filename"].Value);
					if(!System.IO.File.Exists(incfile)){
						System.Console.WriteLine("#include 指定した file '{0}' は見つかりませんでした。",incfile);
						return "";
					}else{
						System.Console.WriteLine("#include 指定した file '{0}' を取り込みます。",incfile);
					}
					
					// 内容
					string inc_content=System.IO.File.ReadAllText(incfile,Program.enc);
					FileInfo incinfo=new FileInfo();
					incinfo.filename=incfile;
					inc_content=Process(inc_content,incinfo);
					return @"/*-------------------------------------------------------------------
	Start of Inclusion from file '"+incfile+@"'
-------------------------------------------------------------------*/
(function(){
"+RegExp.Indent(inc_content)+@"
})();
/*-------------------------------------------------------------------
	End of Inclusion
-------------------------------------------------------------------*/
";
				}
				case "debug": 
					// ■ debug 0 以外には対応していない。
					// ■ 入れ子になっている場合に対応していない
					System.Console.WriteLine("#debug");
					System.Console.WriteLine("#> 一つの debug-region が除去されました");
					return "\n";
				case "mwgwait":{
					string fn=StringFromLiteral(m.Groups["filename"].Value).ToLower();
					info.mwg_waits.Add(fn);
					return "";
				}
				default:
					System.Console.WriteLine("!{0} は未知のプリプロセッサディレクティブです。無視します。",m.Groups["name"].Value);
					return m.Value;
			}
		});
		info.filename=_filename;

		return content;
	}

	public static string StringFromLiteral(string str){
		// 囲み文字
		//char c;
		if(str[0]=='"'&&str[str.Length-1]=='"'){
			//c='"';
		}else if(str[0]=='\''&&str[str.Length-1]=='\''){
			//c='\'';
		}else{
			throw new System.ArgumentException("指定した文字列は、文字列のリテラルではありません。\r\n指定した文字列: "+str,"str");
		}
		str=str.Substring(1,str.Length-2);

		System.Text.StringBuilder build=new System.Text.StringBuilder();
		bool backslash=false;
		for(int i=0;i<str.Length;i++){
			if(backslash||str[i]!='\\'){
				build.Append(str[i]);
				backslash=false;
			}else{
				backslash=true;
			}
		}
		return build.ToString();
	}
}

public static class TranslateContext{
	const string rex_quotedstr=@"""(?:[^""\\]|\\.)*""|'(?:[^'\\]|\\.)*'";
	const string rex_quotedstr_at=@"@""(?:[^""]|"""")*""|@'(?:[^']|'')*'";

	// context の置換
	const string rex_ctxdecl=@"(?<indent>[ \t]*)\bcontext\b\s*(?<ctx>[\w\d_@]+|"+rex_quotedstr+@")\s*";
	const string rex_ctx_new=@"(?:new\s*(?<newarg>\((?:[^""'\(\)]|"+rex_quotedstr+@")*\))\s*)?";
#if MAKE_CONTEXT_SCOPE
	static Rgx::Regex reg_ctx=new Rgx::Regex(
		rex_ctxdecl+rex_ctx_new+@"\{(?<ctxcontent>"+rex_4braces+@")\}",Rgx::RegexOptions.Multiline
		);
#else
	static Rgx::Regex reg_ctx=new Rgx::Regex(
		rex_ctxdecl+rex_ctx_new+@"\{",Rgx::RegexOptions.Multiline
		);
#endif

	// command の置換
	const string rex_cmddecl=@"\b(?<target>command|letter)\s+(?<cmd>[\w\d_@]+\*?|"+rex_quotedstr+@")\s*";
	const string rex_arglist=@"\s*(?<arglist>(?:[^\)'""]|"+rex_quotedstr+@")+)\s*";
	const string rex_cmd_context=@"\s+in\s*(?<cmdctx>"+rex_quotedstr+@")\s*";


	// {} を含まない statements
	const string rex_nobrace	=@"[^\{\}'""]|"+rex_quotedstr;
	const string rex_0braces	=@"(?:"+rex_nobrace+@")+";
	const string rex_1braces	=@"(?:"+rex_0braces+@"|\{"+rex_0braces+@"\})+";
	const string rex_2braces	=@"(?:"+rex_1braces+@"|\{"+rex_1braces+@"\})+";
	const string rex_3braces	=@"(?:"+rex_2braces+@"|\{"+rex_2braces+@"\})+";
	const string rex_4braces	=@"(?:"+rex_3braces+@"|\{"+rex_3braces+@"\})+";

	const string rex_cmd_str	=@"(?<str>[@SD](?:[^\s\;""']|"+rex_quotedstr+@")+)(?:"+rex_cmd_context+@")?";
	const string rex_cmd_func	=@"\{(?<func>"+rex_4braces+@")\}";
  
	static Rgx::Regex reg_cmd=new Rgx::Regex(
		rex_cmddecl
		+@"\(\s*(?<argN>\d+)\s*(?:\,"+rex_arglist+@")?\)\s*(?:"+rex_cmd_str+"|"+rex_cmd_func+@")\s*\;",
		Rgx::RegexOptions.Multiline
  );
  
  public static string Translate(ProgramArgs _args,string content){
		//--------------------------------------------------
		// context の置換
		//--------------------------------------------------
		content=reg_ctx.Replace(content,delegate(Rgx::Match m){
			string name=m.Groups["ctx"].Value;
			if(name[0]!='"')name="\""+name+"\"";

			string ctor=m.Groups["newarg"].Success?"=new ns.ContextFactory"+m.Groups["newarg"].Value:"";
#if MAKE_CONTEXT_SCOPE
			return
        "(function(){\n"+
        "  with(ns.ContextFactory["+name+"]"+ctor+"){\n"+
        "    var _Ctx=ns.ContextFactory["+name+"];\n"+
        m.Groups["ctxcontent"].Value+"}\n"+
        "})();\n";
#else
      string indent=m.Groups["indent"].Value;
      if(_args.option_partial){
        string baseContext="";
        if(m.Groups["newarg"].Success){
          baseContext=m.Groups["newarg"].Value;
          baseContext=baseContext.Substring(1,baseContext.Length-2).Trim(); // ( と ) を除去
          if(baseContext.Length>0)
            baseContext=","+baseContext;
        }
        return
          indent+"new function(){\n"+
          indent+"  var _Ctx=ns.ContextFactory.GetInstance("+name+baseContext+");\n"+
          indent+"  var _CtxName="+name+";";
      }else{
        return
          indent+"with(ns.ContextFactory["+name+"]"+ctor+"){\n"+
          indent+"  var _Ctx=ns.ContextFactory["+name+"];\n"+
          indent+"  var _CtxName="+name+";";
      }
		});
#endif

		//--------------------------------------------------
		// command の置換
		//--------------------------------------------------
		content=reg_cmd.Replace(content,delegate(Rgx::Match m){
			// Hook 先
			string target=m.Groups["target"].Value;
			if(target=="command"){
				target="Command";
			}else if(target=="letter"){
				target="Letter";
			}

			// 登録名
			string name=m.Groups["cmd"].Value;
			if(name[0]!='"')name="\""+name+"\"";

			// 既定の引数
			string arglist=m.Groups["arglist"].Value;
			if(arglist=="") {
				arglist="null";
			}else{
				arglist="["+arglist+"]";
			}

			// コマンドの種類
			string type;
			string definition=m.Groups["str"].Value;
			if(definition!=""){
				arglist+=","+definition.Substring(1);
				switch(definition[0]){
					case '@': type="Literal"; break;
					case 'S':
						type="Static";
						if(m.Groups["cmdctx"].Success){
							arglist+=","+m.Groups["cmdctx"].Value+"";
							// ※ m.Groups["cmdctx"].Value は context 名を格納した文字列リテラル
							// 　ns.Command.parser 内で (文字列 → Context) の自動変換が行われる。
						}else{
							arglist+=",_Ctx";
						}
						break;
					case 'D': type="Dynamic"; break;
					default:
						throw new System.Exception("茲には来ない筈");
				}
			}else{
				definition=m.Groups["func"].Value;
				arglist+=",function(DOC,ARGS){"+definition+"}";
				type="Function";
			}

			string handler
				="ns.Command.Create"+type+"Handler"
				+"("+m.Groups["argN"].Value+","+arglist+")";

      if(_args.option_partial)
        return "_Ctx.Add"+target+"Handler("+name+","+handler+");";
      else
        return "Add"+target+"Handler("+name+","+handler+");";
		});

		content=TranslateCommand2(_args,content);

		//--------------------------------------------------
		// 行頭の置換
		//--------------------------------------------------
		//content=RegExp.Indent(content);

		return content+"\r\n";
	}
  
	//==========================================================================
	//	command2 の置換
	//==========================================================================
	const string rex_braces		=@"(?:"+rex_nobrace+@"|(?'start'\{)|(?'end-start'\}))*?(?=\})(?(start)(?!))";
	const string rex_cmd2decl	=@"\b(?<target>command|letter|environment)\s+(?<cmdtype>[sf][^\\#]*)[\\#](?<cmdname>[\w\d_@]+\*?|"+rex_quotedstr+@"|[^'""])\s*";
	const string rex_cmd2_arg	=@"\(\s*(?<arg>(?:[^\)'""]|"+rex_quotedstr+@")*)\s*\)";
	const string rex_cmd2_str	=@"(?<str>(?:"+rex_quotedstr_at+@"|"+rex_quotedstr+@"))";
	const string rex_cmd2_func	=@"\{(?<func>"+rex_braces+@")\}";
	static Rgx::Regex reg_cmd2=new Rgx::Regex(
		rex_cmd2decl+rex_cmd2_arg+@"\s*(?:"+rex_cmd2_str+"|"+rex_cmd2_func+@")\s*\;",
		Rgx::RegexOptions.Multiline
		);
	static string TranslateCommand2(ProgramArgs _args,string content){
		content=reg_cmd2.Replace(content,delegate(Rgx::Match m){
			// 登録名
			string name=m.Groups["cmdname"].Value;
			if(name[0]!='"'&&name[0]!='\'')name=RegExp.DoubleQuoteText(name);

			// Hook 先
			string target=m.Groups["target"].Value;
			switch(target){
				case "command":
					target="Command";
					goto command;
				case "letter":
					target="Letter";
					goto command;
				command:
          if(_args.option_partial){
            string cmddef=GetCommandInitializer_1308(m);
            return "_Ctx.Define"+target+"({"+name+":"+cmddef+"});";
          }else{
            string handler=GetCommandInitializer(m);
            return "Add"+target+"Handler("+name+","+handler+");";
          }
				case "environment":{
					string handler=GetEnvironmentInitializer(m);
          if(_args.option_partial)
            return "_Ctx.AddEnvironment("+name+","+handler+");";
          else
            return "AddEnvironment("+name+","+handler+");";
				}
				default:
					return m.Value;
			}
		});

		return content;
	}
	static string GetCommandInitializer(Rgx::Match m){
		// コマンドの種類
		string cmdtype='"'+m.Groups["cmdtype"].Value+'"';

		// 既定の引数
		string argdef=m.Groups["arg"].Value;
		if(argdef=="")
			argdef="null";
		else if(argdef[0]!='"'&&argdef[0]!='\'')
			argdef=RegExp.DoubleQuoteText(argdef);

		// コマンドの内容
		string definition=m.Groups["str"].Value;
		{
			if(definition!=""){
				// @ 文字列を通常文字列に変換
				if(definition[0]=='@'){
					string q=definition[1].ToString();
					definition=q+definition.Substring(2).Replace("\\","\\\\").Replace(q+q,"\\"+q);
				}
			}else{
				definition=m.Groups["func"].Value;
        if(cmdtype=="\"f@\"")
          definition="function(doc,cmdName){"+definition+"}";
        else
          definition="function(doc,argv){"+definition+"}";
			}
		}

		return "new ns.Command2("+cmdtype+","+argdef+","+definition+")";
	}
  static string GetCommandInitializer_1308(Rgx::Match m){
		// コマンドの種類
		string cmdtype=m.Groups["cmdtype"].Value;
		string argdef=RegExp.UnquoteText(m.Groups["arg"].Value);
    string commandTypeAndParam;
    if(argdef!="")
      commandTypeAndParam=RegExp.SingleQuoteText(cmdtype+";"+argdef);
    else
      commandTypeAndParam=RegExp.SingleQuoteText(cmdtype);

		// コマンドの内容
		string definition=m.Groups["str"].Value;
    if(definition!=""){
      // @ 文字列を通常文字列に変換
      if(definition[0]=='@'){
        string q=definition[1].ToString();
        definition=q+definition.Substring(2).Replace("\\","\\\\").Replace(q+q,"\\"+q);
      }
    }else{
      definition=m.Groups["func"].Value;
      if(cmdtype=="f@")
        definition="function(doc,cmdName){"+definition+"}";
      else
        definition="function(doc,argv){"+definition+"}";
    }

		return "["+commandTypeAndParam+","+definition+"]";
  }
	static string GetEnvironmentInitializer(Rgx::Match m){

		// コマンドの種類
		string cmdtype,context;
		{
			string value=m.Groups["cmdtype"].Value;
			int index=value.IndexOf(':');
			if(index>=0){
				cmdtype=RegExp.DoubleQuoteText(value.Substring(0,index));
				context=RegExp.DoubleQuoteText(value.Substring(index+1));
			}else{
				cmdtype=RegExp.DoubleQuoteText(value);
				context="_CtxName"; // 登録先の context
			}
		}

		// 既定の引数
		string argdef=m.Groups["arg"].Value;
		if(argdef=="")
			argdef="null";
		else if(argdef[0]!='"'&&argdef[0]!='\'')
			argdef=RegExp.DoubleQuoteText(argdef);

		// コマンドの内容
		string definition=m.Groups["str"].Value;
		{
			if(definition!=""){
				// @ 文字列を通常文字列に変換
				if(definition[0]=='@'){
					string q=definition[1].ToString();
					definition=q+definition.Substring(2).Replace("\\","\\\\").Replace(q+q,"\\"+q);
				}
			}else{
				definition=m.Groups["func"].Value;
				definition="function(doc,argv){"+definition+"}";
			}
		}

		return "ns.Environment.Create("+cmdtype+","+argdef+","+definition+","+context+")";
	}
}

public static class RegExp{
	public const string rex_quotedstr=@"""(?:[^""\\]|\\.)*""|'(?:[^'\\]|\\.)*'";

	static Rgx::Regex reg_startline=new Rgx::Regex("^",Rgx::RegexOptions.Multiline);
	public static string Indent(string str){
		return reg_startline.Replace(str,"\t");
	}

  //---------------------------------------------------------------------------
  // JavaScript literals


	static Rgx::Regex _reg_process_atstring;

  static Rgx::Regex reg_process_atstring{
    get{
      if(_reg_process_atstring==null){
        string rex_comment    =@"/\*[\s\S]*?\*/|//[^\n\r]*(?=$|\n|\r)";
        string rex_regex_head =@"(?:^|[\;\{\}\=\+\?\:\,\(]|"+rex_comment+@"|\btypeof|\bcase|\bdo|\breturn)\s*";
        string rex_regex_body =@"/(?:[^\\\n\r\t/\*]|\\.)(?:[^\\\n\r\t\/]|\\.)*/[migy]{0,4}";
        string rex_regex      ="(?:"+rex_regex_head+")(?:"+rex_regex_body+")";
        string rex_atstring   =@"@""(?<atdq>(?:[^""\r\n]|"""")*)""(?!"")|@'(?<atsq>(?:[^'\r\n]|'')*)'(?!')";
        _reg_process_atstring=new Rgx::Regex(rex_regex+"|"+rex_comment+"|"+rex_quotedstr+"|"+rex_atstring);
      }
      return _reg_process_atstring;
    }
  }

  public static string JsConvertAtStrings(string text){
    return reg_process_atstring.Replace(text,m=>{
      if(m.Groups["atdq"].Success){
        string content=m.Groups["atdq"].Value;
        return DoubleQuoteText(content.Replace("\"\"","\""));
      }

      if(m.Groups["atsq"].Success){
        string content=m.Groups["atsq"].Value;
        return SingleQuoteText(content.Replace("''","'"));
      }

      return m.Value;
    });
  }

	static Rgx::Regex reg_comment=new Rgx::Regex(@"/\*[\s\S]*?\*/|//(?:[^""']|"+rex_quotedstr+@")*?$",Rgx::RegexOptions.Multiline);
	static Rgx::Regex reg_empline=new Rgx::Regex(@"(?:\r?\n|\r)(?:\s*(?:\r?\n|\r))+");
	static Rgx::Regex reg_strline=new Rgx::Regex(@"^\s+",Rgx::RegexOptions.Multiline);
	public static string CutComment(string str){
		// ※ '//' で始まるコメントに孤立した ",' が含まれている場合には無視される
		str=reg_comment.Replace(str,"\r\n");
		str=reg_empline.Replace(str,"\r\n");
		str=reg_strline.Replace(str,"");
		return str;
	}

  //---------------------------------------------------------------------------
  // CR/LF to CR LF

	static Rgx::Regex reg_linebreak=new Rgx::Regex(@"(?:\r?\n|\r)");
	public static string CanonicalizeLine(string input){
		return reg_linebreak.Replace(input,"\r\n");
	}

  //---------------------------------------------------------------------------
  // quoting strings

	static Rgx::Regex reg_unescape=new Rgx::Regex("\\\\(?<ch>.)");
  public static string UnquoteText(string text){
    if(text.Length>=3){
      if(text[0]=='@'&&(text[1]=='\''||text[1]=='"')&&text[text.Length-1]==text[1]){
        text=text.Substring(2,text.Length-3);
        string esc=text[1].ToString();
        return text.Replace(esc+esc,esc);
      }
    }

    if(text.Length>=2){
      if((text[0]=='\''||text[0]=='"')&&text[text.Length-1]==text[0]){
        text=text.Substring(1,text.Length-2);
        return reg_unescape.Replace(text,delegate(Rgx::Match m){
          string value=m.Groups["ch"].Value;
          int index="rntfv\\\"'".IndexOf(value);
          if(index>=0)
            return "\r\n\t\f\v\\\"'"[index].ToString();
          else
            return value;
        });
      }
    }
    
    return text;
  }

	static Rgx::Regex reg_dqescape=new Rgx::Regex(@"[\r\n\t\f\v\\""']");
	public static string DoubleQuoteText(string text){
		return '"'+reg_dqescape.Replace(text,delegate(Rgx::Match m){
			return @"\"+@"rntfv\""'"["\r\n\t\f\v\\\"'".IndexOf(m.Value)];
		})+'"';
	}
	static Rgx::Regex reg_sqescape=new Rgx::Regex(@"[\r\n\t\f\v\\']");
	public static string SingleQuoteText(string text){
		return "'"+reg_sqescape.Replace(text,delegate(Rgx::Match m){
			return "\\"+"rntfv\\'"["\r\n\t\f\v\\'".IndexOf(m.Value)];
		})+"'";
	}
}
