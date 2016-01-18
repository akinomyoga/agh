using Rgx=System.Text.RegularExpressions;
using Gen=System.Collections.Generic;

public static class Program{
	public static void Main(string[] args){
		Setting s=new Setting(args);
		if(s.InputFile==null){
			System.Console.WriteLine("! 有効な入力ファイルが指定されていません。終了します。");
			return;
		}

		string content=System.IO.File.ReadAllText(s.InputFile,System.Text.Encoding.UTF8);
		WriteCompatibleCss(s,content,"trident");
		WriteCompatibleCss(s,content,"gecko");
		WriteCompatibleCss(s,content,"webkit");
		WriteCompatibleCss(s,content,"opera");
	}

	private static void WriteCompatibleCss(Setting s,string content,string renderer){
		renderer=renderer.ToLower();

		Rgx::Regex reg_renderer=new Rgx::Regex(
			"\\b"+renderer+"\\b",
			Rgx::RegexOptions.IgnoreCase|Rgx::RegexOptions.Compiled
		);
		string compat_content=reg_compat.Replace(content,delegate(Rgx::Match m){
			//if(m.Groups["renderer"].Value.ToLower()!=renderer)return "";
			if(!reg_renderer.IsMatch(m.Groups["renderer"].Value))return m.Groups["else"].Value??"";
			return m.Groups["body"].Value;
		});

		string outputfile=s.InputFileWithoutExtension+extensions[renderer];
		System.IO.File.WriteAllText(outputfile,compat_content,System.Text.Encoding.UTF8);
		System.Console.WriteLine(". '{0}' に出力をしました。",outputfile);
	}

	const string rex_0braces	=@"(?:"+rex_nobrace+@")+";
	const string rex_1braces	=@"(?:"+rex_0braces+@"|\{"+rex_0braces+@"\})+";

	const string rex_quotedstr	=@"""(?:[^""\\]|\\.)*""|'(?:[^'\\]|\\.)*'";
	const string rex_comment	=@"\/\*(?!\#)(?:[^\*]|\*(?!\/))+\*\/"; // /*# .. */ 以外のコメント
	const string rex_nobrace	=@"[^\{\}'""\/]|\/(?!\*)|"+rex_quotedstr+"|"+rex_comment;
	const string rex_braces		=@"(?:"+rex_nobrace+@"|(?'start'\{)|(?'end-start'\}))*?(?=\})(?(start)(?!))";
	const string rex_compat_h	=@"\/\*\#compat\:(?<renderer>[\w\|]+)\#\*\/";
	const string rex_compat_m	=@"\/\*\#else\#\*\/";
	const string rex_compat_f	=@"\/\*\#endcompat\#\*\/";
	const string rex_compat
		=rex_compat_h+@"(?<body>"+rex_1braces+@")"
		+"(?:"+rex_compat_m+@"(?<else>"+rex_1braces+@")"+")?"
		+rex_compat_f;
	//const string rex_compat		=@"(?<body>"+rex_1braces+@")";
	static Rgx::Regex reg_compat=new Rgx::Regex(
		rex_compat,
		Rgx::RegexOptions.IgnoreCase|Rgx::RegexOptions.Compiled
		);

	static Gen::Dictionary<string,string> extensions=new System.Collections.Generic.Dictionary<string,string>();
	static Program(){
		extensions["trident"]	=".ie.css";
		extensions["gecko"]		=".fx.css";
		extensions["webkit"]	=".sf.css";
		extensions["opera"]		=".op.css";
	}
	
	public static void ShowHelp(){
		System.Console.WriteLine(@"
===============================================================================
        ブラウザ互換別 CSS 生成器                     copyright 2009, K. Murase
===============================================================================
ブラウザ別に CSS を用意したい時に複数記述するのは面倒くさい。なので、一つの css
ファイルの中に纏めて記述を行って仕舞い、その後で複数生成する。その為の物。

説明)

▼ 使い方
  >csscompat <css ファイル名:sample.css>

utf-8 で保存された sample.css から、
・sample.ie.css /* for Trident */
・sample.fx.css /* for Gecko */
・sample.sf.css /* for WebKit */
の三つのファイルを出力します。

▼ 纏めて記述を行う css の書き方 (例)
----------------------------------------------------
  @compat(gecko){
     /* Firefox 用のファイルにだけ出力する部分 */
     toge{toge:toge;}
     ...
  }

  /* 共通部分 */
  hoge{hoge:hoge;}
  ...

  @compat(trident){
    /* IE 用のファイルにだけ出力 */
    hone{hone:hone;}
    ...
  }

  @compat(webkit){
    /* WebKit 用のファイルにだけ出力 */
    koge{koge:koge;}
    ...
  }
----------------------------------------------------
                                                                             ■
");
	}
}

public class Setting{
	private string directory="";
	/// <summary>
	/// 入力ファイルのパスを保持します。
	/// </summary>
	private string input=null;
	/// <summary>
	/// 入力ファイルのパスを取得又は設定します。
	/// </summary>
	public string InputFile{
		get{return this.input;}
		set{
			if(!System.IO.File.Exists(value)){
				System.Console.WriteLine("setting> ファイル '{0}' は存在しません。",value);
				value+=".css";
				if(!System.IO.File.Exists(value))return;
				System.Console.WriteLine("setting> ファイル '{0}' と解釈します。",value);
			}

			this.input=value;
			this.directory=System.IO.Path.GetDirectoryName(value);
		}
	}
	public string InputFileWithoutExtension{
		get{
			int sz_ext=System.IO.Path.GetExtension(input).Length;
			return this.input.Substring(0,this.input.Length-sz_ext);
		}
	}
	/// <summary>
	/// 指定したコマンドライン引数を使用して Setting の初期化を実行します。
	/// </summary>
	/// <param name="args"></param>
	public Setting(string[] args){
		foreach(string a in args){
			if(a[0]=='-'||a[0]=='/'){
				// options;
				string arg=a.Substring(1);
				switch(arg.ToLower()){
					case "help":
					case "?":
						Program.ShowHelp();
						break;
					default:
						System.Console.WriteLine("setting> オプション -{0} は認識できません。",arg);
						break;
				}
			}else{
				this.InputFile=a;
			}
		}
	}
}