// -*- coding:utf-8 -*-
#define REPL_INTEG
using Rgx=System.Text.RegularExpressions;
using Diag=System.Diagnostics;
using Gen=System.Collections.Generic;
using _=RexJS;

using Interop=System.Runtime.InteropServices;

public static class Program{
  public static int Main(string[] argv){
    InitConsole();

    Argument args=new Argument(argv);
    if(!args.Status)
      return 1;

    if(args.Verbose){
      args.WriteLine("--------------------------------------------------");
      args.WriteLine("  gzjs.cs  - JavaScript Compressor                ");
      args.WriteLine("                     copyright                 ");
      args.WriteLine("                       2015,      KM           ");
      args.WriteLine("                       2008-2011, Koichi Murase");
      args.WriteLine("--------------------------------------------------");
    }

    if(args.IsHelp){
      args.PrintHelp();
      return 0;
    }

    Process(args);
    return 0;
  }

  static void InitConsole(){
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

  static void Process(Argument cmdline){
    if(cmdline.IsTest){
      Trans.Test(cmdline);
      return;
    }

    // 各ファイルに対する処理
    System.Text.StringBuilder bcontent=new System.Text.StringBuilder();
    foreach(string file in cmdline.FileNames){
      string content1=System.IO.File.ReadAllText(file,System.Text.Encoding.UTF8);
      if(cmdline.Verbose)
        cmdline.WriteLine("gzjs: read from {0}.",file);

      content1=Trans.ProcessSource(content1,cmdline);
      if(cmdline.TokenReplacing)
        content1=Trans.GenerateTokenReplacing2(content1,cmdline);
      bcontent.Append(content1);
    }

    // 全体に対する処理
    string content=bcontent.ToString();
    if(cmdline.IsSfx85)
      content=Trans.CreateSfx85(content);
    else if(cmdline.IsSfx)
      content=Trans.CreateSfx(content);

    content=content.Replace("\r\n","\n");

    // 書込
    if(cmdline.IsGzipCompress){
      string gzfile=cmdline.OutputFile;
      if(cmdline.OutputFile=="-"){
        using(System.IO.Stream stdout=System.Console.OpenStandardOutput())
          IO.SaveAsGzipFile(stdout,content);
      }else
        IO.SaveAsGzipFile(gzfile,content);

      // <gzip.exe を使う場合>
      // string tempfile=System.IO.Path.Combine(IO.path_temp,System.IO.Path.GetFileName(cmdline.OutputFile));
      // writeFile(tempfile,content);
      // string gzfile=cmdline.OutputFile+".gz";
      // IO.gzip(tempfile,gzfile,false);
      // </gzip>

      if(cmdline.Verbose)
        cmdline.WriteLine("gzjs: wrote to {0}.",gzfile);
    }else{
      string outfile=cmdline.OutputFile;
      if(outfile=="-")
        System.Console.Write(content);
      else
        writeFile(outfile,content);
      if(cmdline.Verbose)
        cmdline.WriteLine("gzjs: wrote to {0}.",outfile);
    }
  }

  private static void writeFile(string fname,string content){
    // 関数 System.IO.File.WriteAllText は、
    // System.Text.Encoding.UTF8 を明示的に指定すると BOM ありになる。既定ではBOMなしutf-8。

    //System.IO.File.WriteAllText(fname,content); // BOM なし
    //System.IO.File.WriteAllText(fname,content,System.Text.Encoding.UTF8); // BOMあり
    System.IO.File.WriteAllText(fname,content,new System.Text.UTF8Encoding(false)); // BOM なし
  }

  internal static string Include(string filename,Argument args){
    // search include file
    string dirname=System.IO.Path.GetDirectoryName(args.OutputFile);
    string fname0=filename;
    string fname=System.IO.Path.Combine(dirname,fname0);
    if(!System.IO.File.Exists(fname)){
      fname=fname0;
      if(!System.IO.File.Exists(fname)){
        args.WriteLine("#> '"+fname0+"' なるファイルが見つかりません。");
        args.WriteLine("#> include は中止されます。");
        return null;
      }
    }

    // process include file
    string content=System.IO.File.ReadAllText(fname);
    if(System.IO.Path.GetExtension(fname).ToLower()==".css"){
      args.WriteLine("----------------");
      args.WriteLine("#> file: '{0}'",fname);
      args.WriteLine("#> convert .css to .js");
      content=Trans.ScriptizeCss(content);
      args.WriteLine("#> inclusion completed");
      args.WriteLine("----------------");
    }else{
      args.WriteLine("----------------");
      args.WriteLine("#> file: '{0}'",fname);
      args.WriteLine("#> start");
      content=Trans.ProcessSource(content,new Argument(fname));
      args.WriteLine("#> end");
      args.WriteLine("----------------");
    }
    return content;
  }
}

public class Argument{
  Gen::List<string> filenames=new Gen::List<string>();
  public Gen::List<string> FileNames{
    get{return this.filenames;}
  }

  string firstFile=null; // 初めの入力ファイル名 (既定の outfile を決定するのに使用)
  string outfile=null;
  public string OutputFile{
    get{
      if(this.IsGzipCompress){
        if(this.filenames.Contains(this.outfile))
          return this.outfile+".gz";
        else if(System.IO.Path.GetExtension(this.outfile).ToLower()==".js")
          return this.outfile+".gz";
        else
          return this.outfile;
      }

      if(this.filenames.Contains(this.outfile)){
        string ext=System.IO.Path.GetExtension(this.outfile);
        string fileWithoutExt=this.outfile.Substring(0,this.outfile.Length-ext.Length);
        return fileWithoutExt+".out"+ext;
      }else
         return this.outfile;
    }
    set{this.outfile=value;}
  }
  public bool OutputsStdout{get{return this.outfile=="-";}}

  private bool test=false;
  public bool IsTest{
    get{return this.test;}
  }

  private bool verbose=false;
  public bool Verbose{
    get{return this.verbose;}
  }

  public void WriteLine(string format,params object[] va){
    // 標準出力に結果を吐く場合は、メッセージは標準エラーへ。
    if(this.OutputsStdout)
      System.Console.Error.WriteLine(format,va);
    else
      System.Console.WriteLine(format,va);
  }

  //------------------------------------------------------------
  //  圧縮の種類
  //------------------------------------------------------------
  private bool flag_gz=true;
  public bool IsGzipCompress{
    get{return !this.flag_sfx&&!this.flag_sfx85&&this.flag_gz;}
    set{this.flag_gz=value;}
  }

  private bool flag_sfx=false;
  public bool IsSfx{
    get{return this.flag_sfx;}
  }

  private bool flag_sfx85=false;
  public bool IsSfx85{
    get{return this.flag_sfx85;}
  }

  bool replacing=false;
  public bool TokenReplacing{
    get{return this.replacing;}
    set{this.replacing=value;}
  }

  bool comment=true;
  public bool CutComment{
    get{return this.comment;}
  }
  //============================================================
  //  初期化
  //============================================================
  public Argument(string filename){
    this.flag_gz=false;
    this.firstFile=filename;
    this.filenames.Add(filename);
    this.outfile=filename;
  }

  private bool status;
  private bool ishelp=false;
  public bool Status{get{return this.status;}}
  public bool IsHelp{get{return this.ishelp;}}
  private int index;
  private string[] args;
  
  private void printArgumentError(string message){
    this.status=false;
    System.Console.Error.WriteLine(
      "gzjs (args[{0}] = {2})! {1}",
      this.index,message,this.args[this.index]);
  }
  private void printArgumentError(string format,params object[] va){
    this.printArgumentError(string.Format(format,va));
  }

  /// <summary>
  /// コマンドライン引数から初期化を実行します。
  /// </summary>
  /// <param name="args"></param>
  public Argument(string[] args){
    this.status=true;
    this.args=args;
    this.index=0;
    for(this.index=0;this.index<this.args.Length;this.index++){
      string arg=this.args[this.index];
      if(arg[0]!='-'){
        string file;
        if(System.IO.File.Exists(file=arg)||System.IO.File.Exists(file=arg+".js")){
          this.filenames.Add(file);
          if(this.firstFile==null)
            this.firstFile=file;
          continue;
        }
      }
      
      if(arg[0]=='/'||arg[0]=='-')
        ReadOption(arg.Substring(1));
      else{
        this.printArgumentError(
          "the specified file ({0}) does not exist.",arg);
      }
    }

    if(!ishelp&&this.filenames.Count==0){
      this.status=false;
      System.Console.Error.WriteLine("gzjs (args)! no input files are specified.");
    }

    if(this.outfile==null)
      this.outfile=this.firstFile;
  }

  private bool flagFoldString=true;
  public bool FlagFoldString{get{return this.flagFoldString;}}

  private bool setArgumentFlag(string name,bool value){
    switch(name){
    case "gz":this.flag_gz=value;break;
    case "sfx":this.flag_sfx=value;break;
    case "sfx85":this.flag_sfx85=value;break;
    case "rtok":this.replacing=value;break;
    case "comment":this.comment=value;break;

    case "fold-string":this.flagFoldString=value;break;
    default:
      this.printArgumentError("gzjs! unrecognized flag name '{0}'",name);
      return false;
    }
    return true;
  }
  public bool ReadOption(string option){
    // gcc style options
    if(option[0]=='W'){
      if(option.StartsWith("Wno-"))
        return setArgumentFlag(option.Substring(4),false);
      else
        return setArgumentFlag(option.Substring(1),true);
    }else if(option[0]=='o'){
      if(option.Length==1){
        if(this.index+1>=this.args.Length){
          this.printArgumentError("missing argument for the option.");
          return false;
        }
        
        this.index++;
        if(this.args[this.index].Length==0){
          this.printArgumentError("empty output file '' is specified");
          return false;
        }

        this.outfile=this.args[this.index];
      }else{
        this.outfile=option.Substring(1);
      }

      string outdir=System.IO.Path.GetDirectoryName(this.outfile);
      if(outdir!=""&&!System.IO.Directory.Exists(outdir)){
        this.printArgumentError(
          "the directory of the specified output file ({0}) is not available",
          outdir);
        return false;
      }
      return true;
    }else if(option[0]=='v'){
      this.verbose=true;
      return true;
    }

    string op=option.ToLower();
    if(op[0]=='c'||op[0]=='C'){
      // option: -c[+-]

      bool value;
      if(op[1]=='+'){
        value=true;
      }else if(op[1]=='-'){
        value=false;
      }else goto unrecognized;

      
      op=op[2]==':'?op.Substring(3):op.Substring(2);
      return setArgumentFlag(op,value);
    }

    switch(op){
    case "test":
      this.test=true;
      break;
    case "?":
    case "help":
    case "-help":
      this.ishelp=true;
      break;
    default:
      goto unrecognized;
    }
    return true;
  unrecognized:
    this.printArgumentError("gzjs! option '-{0}' is unrecognized",op);
    return false;
  }

  public void PrintHelp(){
    System.Console.WriteLine(
@"gzjs [options...] files...

Options
    -oFILE    specify default output file.

    -WFLAG    enable the specified flag. 
    -Wno-FLAG disable the specified flag.
        FLAG gz      [1] gzip the result
             sfx     [0] generate self extraction code (deflate+base64)
             sfx85   [0] generate self extraction code (deflate+encode85)
             rtok    [0] replace tokens
             comment [1] remove comments and spaces

    -v        verbose
    --help    print this help

Older style options
    -c+FLAG   enable the flag (old style)
    -c-FLAG   disable the flag (old style)
    /?           
    /help
    /test     execute test

Directrives in the input files
    //#gzjs-output(<output filename>)
    //#gzjs-option(<options>)
    //#gzjs-include(<include filename>)
    //#gzjs-tokenmap(<before>,<after>)
    //#gzjs-replace(<before>,<after>)
"
);
  }
}

public static class Trans{
  /// <summary>
  /// #gzjs-replace(before,after) の処理を実行するクラスです。
  /// </summary>
  class ReplaceData{
    Rgx::Regex reg;
    string rep;
    public ReplaceData(string before,string after){
      this.reg=new Rgx::Regex(before,Rgx::RegexOptions.Compiled|Rgx::RegexOptions.Multiline);
      this.rep=after;
    }

    public string Replace(string input){
      return reg.Replace(input,this.rep);
    }
  }

  public static string ProcessSource(string input,Argument _args){
    string output=input;
    Argument args=_args;
    string dirname=System.IO.Path.GetDirectoryName(args.OutputFile);

    // directives の読み取り
    Gen::Dictionary<string,string> tokenmap=new Gen::Dictionary<string,string>();
    Gen::List<ReplaceData> replaces=new Gen::List<ReplaceData>();

    output=reg_gzjs_directive.Replace(output,delegate(Rgx::Match m){
      // 先頭以外に改行が入っている物は無効
      if(0<m.Value.IndexOfAny("\r\n".ToCharArray()))return m.Value;
      
      switch(m.Groups["dir"].Value){
      case "outfile":
        args.OutputFile=System.IO.Path.Combine(
          System.IO.Path.GetDirectoryName(args.OutputFile),
          ReadArg(m.Groups["arg1"])
        );
        if(args.Verbose)
          args.WriteLine("#> output-file was set to '"+args.OutputFile+"'");
        return "\n";
      case "tokenmap":{
        string before=ReadArg(m.Groups["arg1"]);
        string after=ReadArg(m.Groups["arg2"]);
        tokenmap[before]=after;
        if(args.Verbose)
          args.WriteLine("#> token-mapping registered: "+before+" -> "+after+"");
        return "\n";
      }
      case "replace":{
        string before=ReadArg(m.Groups["arg1"]);
        string after=ReadArg(m.Groups["arg2"]);
        replaces.Add(new ReplaceData(before,after));
        if(args.Verbose)
          args.WriteLine("#> replace registered: "+before+" -> "+after+"");
        return "\n";
      }
      case "include":{
        if(args.Verbose)
          args.WriteLine("#gzjs-include");
        return Program.Include(ReadArg(m.Groups["arg1"]),args)??m.Value;
      }
      case "option":{
        string op=ReadArg(m.Groups["arg1"]);
        if(!args.ReadOption(op)){
          args.WriteLine("#gzjs-option > '{0}' は認識できない option です",op);
          return m.Value;
        }
        return "\n";
      }
      default:
        return m.Value;
      }
    });

    // コメント空白類の削除
    if(args.CutComment)
      output=RegExp.CutComment(output);

    // token 置き換え
    if(tokenmap.Count>0){
      string rex=null;
      foreach(string token in tokenmap.Keys){
        if(rex==null)rex=token;else rex+="|"+token;
      }
      rex=@"\b(?:"+rex+@")\b";
      output=new Rgx::Regex(rex).Replace(output,delegate(Rgx::Match m){
        return tokenmap[m.Value];
      });
    }

    // #gzjs-replace 実行
    foreach(ReplaceData r in replaces)
      output=r.Replace(output);

    return output;
  }

  const string rex_dir_arg1=@"\s*(?<arg1>"+_.rex_lit_str+@"|"+_.rex_lit_rex+@"|[^""'\(\)\,]*)\s*";
  const string rex_dir_arg2=@"\s*(?<arg2>"+_.rex_lit_str+@"|"+_.rex_lit_rex+@"|[^""'\(\)\,]*)\s*";
  const string rex_dir_1arg=@"(?<dir>outfile|include|option)\s*\("+rex_dir_arg1+@"\)";
  const string rex_dir_tokenmap=@"(?<dir>tokenmap|replace)\s*\("+rex_dir_arg1+@"\,"+rex_dir_arg2+@"\)";
  static Rgx::Regex reg_gzjs_directive=new Rgx::Regex(
    @"^\s*\/\/\#gzjs\-(?:"+rex_dir_1arg+@"|"+rex_dir_tokenmap+@")",
    Rgx::RegexOptions.Multiline|Rgx::RegexOptions.Compiled
    );

  /// <summary>
  /// 読み取った引数の内容を正規化します。(trim, dequotation)
  /// </summary>
  static string ReadArg(Rgx::Group g){
    string ret=g.Value.Trim();
    if(ret.Length>=2){
      if(ret[0]=='"'||ret[0]=='\''){
        ret=Rgx::Regex.Unescape(ret.Substring(1,ret.Length-2));
      }else if(ret[0]=='/'){
        ret=ret.Substring(1,ret.Length-2);
      }
    }
    return ret;
  }
  //**************************************************************************
  //    トークンの置換化
  //==========================================================================
  static Rgx::Regex reg_tok=new Rgx::Regex(@"(\b(?:0|[1-9]\d*)\b)|\b[\w\d]{2,}\b",Rgx::RegexOptions.Compiled);

  private static int getStringLength(int i){
    int codeLength=1;
    for(int d=10;i>=d;d*=10)
      codeLength++;
    return codeLength;
  }

  public static string GenerateTokenReplacing2(string input,Argument args){
    // 1 各単語の登場数を数える
    //
    Gen::Dictionary<string,int> hist=new Gen::Dictionary<string,int>();
    foreach(Rgx::Match m in reg_tok.Matches(input)){
      string word=m.Value;
      if(hist.ContainsKey(word))
        hist[word]++;
      else
        hist[word]=1;
    }

    // 2 単語の "重み" を計算する
    //
    //   ※優先順位は頻度だけで決まる (共に置換すると決まっている場合)
    //
    //     ∵トークン A, B のどちらを 1文字/2文字で表現するか決める場合は、
    //       「1文字の場合の gain がより多い方を選ぶ」のではなく合計の gain で判断すべき。
    //       A, B をそれぞれ a, b と符号化する時、合計の gain は
    //         (len(A)-len(a))count(A)+(len(B)-len(b))count(B)-(len(A)+1+len(B)+1)
    //         = const - len(a)count(A) - len(b)count(B)
    //       これを最大化する為には count() の大きいトークンに小さい符号を割り当てれば良い。
    //       重要なのは各トークン自体の長さには依存しないという事である■
    //
    //   ※或るトークン A が数字 N をおしのけてまで符号化するべきかどうかも頻度で決まる
    //
    //     - もし数字Nも置換対象になっている場合は大体 count(A)-count(N) の gain がある。
    //       (もしトークン A を1文字長い別の符号で表すと count(A) のロスがある。
    //       一方で数字 N を1文字長い別の符号で表すと count(N) のロスがある。
    //       実際には1文字長いだけの符号で表す事ができるかどうかは分からないが。)
    //     - 加えて数字Nをおしのける事によって数字Nを表に登録する必要が出るので
    //       len(N) のロスがある。更に、数字Nの符号 n が最大の符号だとすると区切り文字
    //       として 1 以上のロスが生じる。つまり、符号表が
    //         ....|foo → ....|foo||||||n
    //       等の様に変化するという事である。近似的に常に 1 文字のロスがあるという事にする。
    //     →結局近似的に count(A) - (count(N)+len(N)+1) の gain と考える事にする。
    //       つまり、数字の重みは count(N)+len(N)+1 という事である。
    //
    int wordCount=hist.Count;
    string[] tokens =new string[wordCount];
    int   [] weights=new int   [wordCount];
    int j=0;
    foreach(string cand in hist.Keys){
      tokens [j]=cand;
      weights[j]=hist[cand];

      int icand;
      if(int.TryParse(cand,out icand)&&icand.ToString()==cand)
        weights[j]+=cand.ToString().Length+1;

      j++;
    }
    System.Array.Sort(weights,tokens);

    // 3 重みの高い符号から順番に符号を割り当てる
    //   - 符号は短い物から順に割り当てる
    //   - 整数は無条件で符号化対象として考慮する
    //   - その他の単語は gain > loss の時に考慮する:
    //     "次に短い符号の長さ" を用いて、
    //     その単語の gain, loss を計算する。
    //
    string[] mapCodeToWord=new string[wordCount];

    // 新しいコードの割当先、かつ、有意な符号の終端を表す。
    // 有意な符号とは "自分自身から map される符号" ではないという事。
    int code=0;

    // 有意かどうかに拘わらず登録されている符号の数
    int codeCount=0; // code Count

    // 現在割り当てられている符号の長さ
    // 及び、その長さの符号の範囲
    int ndigit=0,code0=-1,codeM=0;

    int effectiveWordCount=wordCount;

    for(int index=wordCount;--index>=0;){
      string cand=tokens[index];

      if(codeCount>=codeM){
        ndigit++;
        code0=codeM;
        codeM=(int)System.Math.Pow(10,ndigit);
      }

      int icand;
      bool isInt=int.TryParse(cand,out icand)&&icand.ToString()==cand;
      if(!isInt||icand>=effectiveWordCount){
        // gain, loss を計算し割に合わないなら跳ばす
        // 小さい整数(<effectiveWordCount)は別の単語に上書きされる危険があるので跳ばせない
        int loss=cand.Length+1;
        int gain=(cand.Length-ndigit)*hist[cand];
        if(gain<=loss){
          effectiveWordCount--;
          continue;
        }
      }

      if(isInt&&code0<=icand&&icand<codeM){
        // 不変な整数値の場合
        //   整数値で符号と自身の長さが同じ場合は符号表に登録する必要はない
        //   自分自身に対して mapping すれば良い。
        
        if(icand<code){
          // 自分自身の番号に既に別の単語が割り当てられている場合は待避
          mapCodeToWord[code++]=mapCodeToWord[icand];
        }

        if(icand<wordCount)
          mapCodeToWord[icand]="";
      }else{
        // 普通の単語の場合
        //   登録する。既に不変の整数値として決まっている番号は跳ばす。
        while(mapCodeToWord[code]!=null)code++;
        mapCodeToWord[code++]=cand;
      }

      codeCount++;
    }

    // 4 置換の実行
    if(code==0)return input;

    Gen::Dictionary<string,string> mapWordToCode=new Gen::Dictionary<string,string>();
    System.Text.StringBuilder table=new System.Text.StringBuilder();
    for(int c=0;c<code;c++){
      string word=mapCodeToWord[c];
      if(word!="")
        mapWordToCode[word]=c.ToString();

      if(c>0)table.Append(':');
      table.Append(word);

      // System.Console.WriteLine(
      //   "dbg: {0} -> {1} {2}",word,c,hist.ContainsKey(c.ToString())?"collide":"");
    }

    string replaced=reg_tok.Replace(input,delegate(Rgx::Match m){
      string word=m.Value;
      if(mapWordToCode.ContainsKey(word))
        return mapWordToCode[word];
      else
        return word;
    });

    string strTable;
    string strSource;
    if(args.FlagFoldString){
      strTable=Stringize(table.ToString());
      strSource=Stringize(replaced);
    }else{
      strTable="'"+RegExp.EscapeSingleQuote(table.ToString())+"'";
      strSource="'"+RegExp.EscapeSingleQuote(replaced)+"'";
    }

//     string ret=@"(function(){
// var r="+strTable+@".split("":"");
// var s="+strSource+@";
// eval(s.replace(/\b\d+\b/g,function($){return r[$]||$;}));
// })();";

    string ret=@"(function(r){
r="+strTable+@".split("":"");
eval("+strSource+@".replace(/\b\d+\b/g,function($){return r[$]||$;}));
})();";

    if(!args.FlagFoldString)
      ret=RegExp.RemoveLineBreaks(ret);

    return ret.Length<input.Length?ret:input;
  }

  public static string GenerateTokenReplacing(string input){
    // token 登場回数を計数
    Gen::Dictionary<string,int> d_tok=new Gen::Dictionary<string,int>();
    foreach(Rgx::Match m in reg_tok.Matches(input)){
      string k=m.Value;
      if(d_tok.ContainsKey(k))
        d_tok[k]++;
      else
        d_tok[k]=1;
    }

    // 各 token に対するコード減少量の概算
    /*
    Gen::Dictionary<string,int> d_tok2=new Gen::Dictionary<string,int>();
    foreach(string k in d_tok.Keys){
      int iReduce=(k.Length-2)*d_tok[k];
      iReduce-=k.Length+3; // "hoge",
      d_tok2[k]=iReduce;
    }
    /*/
    Gen::Dictionary<string,int> d_tok2=d_tok;
    //*/

    // token に対する代替番号の割り当て
    System.Text.StringBuilder b_tok=new System.Text.StringBuilder();
    Gen::Dictionary<string,int> d_map=new Gen::Dictionary<string,int>();
    int n=0;
    foreach(string k in EnumFreqOrder(d_tok2)){
#if REPL_INTEG
      // k が \d+ か否か
      bool isnum=true;
      for(int i=0;i<k.Length;i++){
        if('0'<=k[i]&&k[i]<='9')continue;
        isnum=false;
        break;
      }

      // k が非整数なら枝刈り判定
      if(!isnum){
        if(d_tok[k]<=1)continue;

        // コード減少量を計算
        int iReduce=(k.Length-n.ToString().Length)*d_tok[k];
        iReduce-=k.Length+3;// "hoge",
        if(iReduce<=0)continue;
      }
#else
      // コード減少量を計算
      int iReduce=(k.Length-1-n.ToString().Length)*d_tok[k];
      iReduce-=k.Length+3;// "hoge",
      if(iReduce<=0)continue;
#endif

      d_map[k]=n;
      if(n++>0)b_tok.Append('|');
      b_tok.Append(k);
    }

    // token の置換
    string replaced=reg_tok.Replace(input,delegate(Rgx::Match m){
      string k=m.Value;
#if REPL_INTEG
      if(d_map.ContainsKey(k))
        return d_map[k].ToString();
#else
      if(d_map.ContainsKey(k))
        return "_"+d_map[k].ToString();
#endif
      return k;
    });

    // 変換結果
#if REPL_INTEG
    return @"(function(){
var r="+Stringize(b_tok.ToString())+@".split('|');
var s="+Stringize(replaced)+@";
eval(s.replace(/\b\d+\b/g,function($){return r[$];}));
})();";
#else
    return @"(function(){
var r="+b_tok.ToString()+@";
var s="+Stringize(replaced)+@";
eval(s.replace(/\b_(\d+)\b/g,function($0,$1){return r[$1];}));
})();";
#endif
  }

  /// <summary>
  /// 文字列をその頻度が多い順に列挙します。
  /// </summary>
  /// <param name="d_tok">文字列と頻度のペアを格納した Dictionary を返します。</param>
  /// <returns>文字列の列挙子を返します。</returns>
  static Gen::IEnumerable<string> EnumFreqOrder(Gen::Dictionary<string,int> d_tok){
    // 頻度順に並び替え
    int c=d_tok.Count;
    string[] tokens=new string[c];
    int[] freqs=new int[c];
    int j=0;
    foreach(string k in d_tok.Keys){
      tokens[j]=k;
      freqs[j]=d_tok[k];
      j++;
    }
    /*
    for(j=0;j<c;j++)
      args.WriteLine("token pair({0}, {1})",freqs[j],tokens[j]);
    args.WriteLine("---- sort ----");
    //*/
    System.Array.Sort(freqs,tokens);
    /*
    for(j=0;j<c;j++)
      args.WriteLine("token pair#{2}({0}, {1})",freqs[j],tokens[j],j);
    //*/

    // 列挙
    for(int i=c-1;i>=0;i--){
      yield return tokens[i];
    }
  }
  static string Stringize(string content){
    const int MAX_WIDTH=128;
    content=RegExp.RemoveLineBreaks(content);

    // 短い場合
    if(content.Length<=MAX_WIDTH)
      return "'"+RegExp.EscapeSingleQuote(content)+"'";

    // 長い場合
    System.Text.StringBuilder b_src=new System.Text.StringBuilder();
    b_src.Append("[\n");

    bool first=true;
    int i=0;
    while(true){
      int c=content.Length-i;
      if(c>MAX_WIDTH)c=MAX_WIDTH;

      if(first)first=false;else b_src.Append(",\n");
      b_src.Append('\'');
      b_src.Append(RegExp.EscapeSingleQuote(content.Substring(i,c)));
      b_src.Append('\'');

      i+=c;
      if(i==content.Length)break;
    }

    b_src.Append("\n].join(\"\")");

    return b_src.ToString();
  }
  //================================================================
  private static Argument test_args=null;
  public static void Test(Argument args){
    test_args=args;
    args.WriteLine("------------------------------------");
    args.WriteLine("  gzjs -- Transform Test");
    args.WriteLine("------------------------------------");
    Rgx::Match m=Rgx::Regex.Match(@"(i<144)",@"\b\d+\b|\b[\w\d]{2,}\b");
    if(m.Success){
      args.WriteLine("OK: {0}",m.Value);
    }else{
      args.WriteLine("NG: reg_gzjs_directive");
    }

    Assert(Rgx::Regex.Match(@"else     return",@"\b +\b").Value,"     ");
    Assert(Rgx::Regex.Match(@"else     return",@"\b +\B").Value,"    ");
    Assert(Rgx::Regex.Match(@"else     return",@"\B +\b").Value,"    ");
    Assert(Rgx::Regex.Match(@"else     return",@"\B +\B").Value,"   ");
    {
      Rgx::Regex reg=new Rgx::Regex("^"+_.rex_braces+"$",Rgx::RegexOptions.Multiline);
      Assert(reg.Match(@" work(); ").Success,true);
      Assert(reg.Match(@" {work({a:b});} var c={0:1} ").Success,true);
      Assert(reg.Match(@" {work(a:b});} var c={} ").Success,false);
    }
    {
      Rgx::Regex reg=new Rgx::Regex(@"^\{"+_.rex_braces+@"\}$",Rgx::RegexOptions.Multiline);
      Assert(reg.Match(@"{ {work({a:b});} var c={0:1} }").Success,true);
      Assert(reg.Match(@"{ {work(a:b});} var c={} }").Success,false);
    }
  }
  private static void Assert(object actual,object ideal){
    bool success=actual==null?ideal==null:actual.Equals(ideal);
    if(!success){
      if(actual==null)actual="null";
      if(ideal==null)ideal="null";
      System.Console.ForegroundColor=System.ConsoleColor.Yellow;
      test_args.WriteLine("Assertion Failed: '{0}' is not '{1}'",actual,ideal);
      System.Console.ResetColor();
    }else{
      test_args.WriteLine("Assertion OK.");
    }
  }
  //**************************************************************************
  //    自己解凍形式化
  //==========================================================================
  private static string CreateSfx_embed(string frame,string compressed){
    System.Text.StringBuilder b=new System.Text.StringBuilder();
    {
      // Header
      const string RPLACE_KEY="REPLACE_TO_SOURCE";
      int k=frame.IndexOf(RPLACE_KEY);
      b.Append(frame,0,k);
      k+=RPLACE_KEY.Length;

      // 行分割出力
      const int C_WIDTH=128;
      int i=0;
      while(true){
        b.Append('\'');
        b.Append(compressed,i,System.Math.Min(C_WIDTH,compressed.Length-i));
        b.Append('\'');
        i+=C_WIDTH;
        if(i>=compressed.Length)break;
        b.Append(",\r\n");
      }

      // Footer
      b.Append(frame,k,frame.Length-k);
    }

    return b.ToString();
  }
  public static string CreateSfx(string input){
    // source
    string compressed=Deflator.DeflateToBase64String(input,9);

    // inflate
    System.IO.Stream sFrame=System.Reflection.Assembly.GetCallingAssembly().GetManifestResourceStream("res/sfxframe.js");
    System.IO.StreamReader sr=new System.IO.StreamReader(sFrame,System.Text.Encoding.UTF8);
    string frame=sr.ReadToEnd();
    sr.Close();
    return CreateSfx_embed(frame,compressed);
  }
  public static string CreateSfx85(string input){
    // source
    string compressed=Deflator.DeflateToJ85String(input,9);

    // inflate
    System.IO.Stream sFrame=System.Reflection.Assembly.GetCallingAssembly().GetManifestResourceStream("res/sfxframe85.js");
    System.IO.StreamReader sr=new System.IO.StreamReader(sFrame,System.Text.Encoding.UTF8);
    string frame=sr.ReadToEnd();
    sr.Close();
    return CreateSfx_embed(frame,compressed);
  }

  //**************************************************************************
  //    Include Css
  //==========================================================================
  public static string ScriptizeCss(string content){
    return
@"(function(){
  var style=document.createElement(""style"");
  style.type=""text/css"";
  style.textContent="+Stringize(content)+@";
  document.getElementsByTagName(""head"")[0].appendChild(style);
})();";
  }
}
public static class IO{
  public static string path_temp;
  static IO(){
    string codebase=System.Reflection.Assembly.GetAssembly(typeof(Program)).Location;
    path_temp=System.IO.Path.Combine(System.IO.Path.GetDirectoryName(codebase),"temp");
    if(!System.IO.Directory.Exists(path_temp))
      System.IO.Directory.CreateDirectory(path_temp);
  }

  public static void gzip(string src,string dest,bool preserve){
    string tempfile=System.IO.Path.Combine(path_temp,System.IO.Path.GetFileName(src)+"[gzip].esc");
    if(preserve)System.IO.File.Copy(src,tempfile);

    // 圧縮
    System.Console.WriteLine("file '{0}' を圧縮します...",src);
    //Diag::Process proc_gz=Diag::Process.Start("gzip.exe","\""+src+"\"");
    //proc_gz.WaitForExit();

    system("gzip.exe -9 \""+src+"\"");

    // gz - ファイル名変更
    string compressed=src+".gz";
    if(System.IO.File.Exists(compressed)) {
      if(System.IO.File.Exists(dest))System.IO.File.Delete(dest);
      System.IO.File.Move(compressed,dest);
      System.Console.WriteLine("無事に '"+dest+"' に圧縮されました。");
    }else{
      System.Console.WriteLine("gz 圧縮結果のファイルが見つかりません。圧縮に失敗している可能性があります。");
    }

    if(preserve)System.IO.File.Move(tempfile,src);
  }

  [Interop::DllImport("msvcrt")]
  private static extern int system(
    [Interop::MarshalAs(Interop::UnmanagedType.LPStr)]string command
  );

  private static readonly System.DateTime UNIX_EPOCH=new System.DateTime(1970,1,1,0,0,0,System.DateTimeKind.Utc);
 
  public static void SaveAsGzipFile(System.IO.Stream s,string content){
    byte[] data=System.Text.Encoding.UTF8.GetBytes(content);
    byte[] deflate=Deflator.DeflateToByteArray(data,9);

    s.WriteByte(31); // ID1
    s.WriteByte(139);// ID2
    s.WriteByte(8);  // CM  deflate
    s.WriteByte(1);  // text file

    long mtime=(long)(System.DateTime.Now-UNIX_EPOCH).TotalSeconds;
    s.WriteByte((byte)(0xFF&mtime));
    s.WriteByte((byte)(0xFF&mtime>>8));
    s.WriteByte((byte)(0xFF&mtime>>16));
    s.WriteByte((byte)(0xFF&mtime>>24));

    s.WriteByte(2); // highest compression
    s.WriteByte(3); // line break = unix style '\n'

    s.Write(deflate,0,deflate.Length);

    uint crc32=Deflator.CalculateCrc32(data);
    s.WriteByte((byte)(0xFF&crc32));
    s.WriteByte((byte)(0xFF&crc32>>8));
    s.WriteByte((byte)(0xFF&crc32>>16));
    s.WriteByte((byte)(0xFF&crc32>>24));
    uint isize=(uint)data.Length;
    s.WriteByte((byte)(0xFF&isize));
    s.WriteByte((byte)(0xFF&isize>>8));
    s.WriteByte((byte)(0xFF&isize>>16));
    s.WriteByte((byte)(0xFF&isize>>24));
  }
  public static void SaveAsGzipFile(string dest,string content){
    using(System.IO.FileStream s=new System.IO.FileStream(dest,System.IO.FileMode.Create,System.IO.FileAccess.Write))
      SaveAsGzipFile(s,content);
  }
}

public static class RegExp{
  const string rex_quotedstr=_.rex_lit_str;
  const string rex_regexp=_.rex_lit_rex;

  // インデントの付加
  static Rgx::Regex reg_startline=new Rgx::Regex("^",Rgx::RegexOptions.Multiline);
  public static string Indent(string str){
    return reg_startline.Replace(str,"\t");
  }

  //================================================================
  //  コメント・空白行・空白の削除
  //================================================================
  const string rex_gr_literals=@"(?<string>"+rex_quotedstr+@"|"+rex_regexp+@")";
  //-----------------------------------
  // コメントを消す
  const string rex_gr_comment=@"(?<comment>/\*[\s\S]*?\*/|//.*?$)";
  static Rgx::Regex reg_comment=new Rgx::Regex(rex_gr_literals+"|"+rex_gr_comment,Rgx::RegexOptions.Multiline);
  //-----------------------------------
  // 連続する空白を消す
  const string rex_gr_empline=@"(?<empline>(?:\r?\n|\r)(?:\s*(?:\r?\n|\r))+)";
  const string rex_gr_delete=@"(?<space>(?<=\b|\$)[\t ]+(?=\b|\$))|(?<delete>^\s+|\s+$|[\t ]+)";
/*
  static Rgx::Regex reg_empline=new Rgx::Regex(rex_gr_empline);
  static Rgx::Regex reg_strline=new Rgx::Regex(@"^\s+|\s+$",Rgx::RegexOptions.Multiline);
/*/
  static Rgx::Regex reg_spaces=new Rgx::Regex(rex_gr_literals+"|"+rex_gr_empline+"|"+rex_gr_delete,Rgx::RegexOptions.Multiline);
//*/

  //-----------------------------------
  // 無駄な改行を消す:
  // 1 /;(\}|$)/ はセミコロンも一緒に消して良い?
  //   但し {for();} 等を {for()} に変形されるとまずいので直前に ) や else 等がない事を確認する。
  //   このパターンは if();else; for(); while(); do; などがある。
  const string rex_break_tailsemicolon=@"(?<!(?:\bdo|\belse|\))\s*);(?:\r?\n)?(?=\}|$)";
  // 2 行末のチェック。
  //   元々終端になっている事が明らかな場合
  //   -; : など
  //   直後に ; を挿入するのが文法的におかしい場合は、次の行に続くはずなので行を消してOK。
  //   -例えば二項演算子 . * / % << >> == != <= >= < > & ^ | && || +=etc ? ,  /[\.\*\/%=<>\^\&\|\?,]/
  //   -また前置演算子も ! ~
  //   -開き括弧も続きがある ( [ \{
  //   -else 後に記号が来る場合も OK。
  const string rex_break_nottail=@"(?<=[;:\.\*\/%=<>\^\&\|\?,!~\(\{\[])\r?\n|(?<=\belse)\r?\n\B";
  // 3 行頭のチェック
  //   文頭に来るはずがないと分かっている物は、前の行の続きと決めつける事ができる。
  //   -二項演算子 . * / % << >> == != <= >= < > & ^ | && || +=etc ? ,
  //   -: も文頭に来る事はない。
  //   -;}]) は明らか(?)なのでOK?
  //   -/ は正規表現かもしれないので危険かも。
  const string rex_break_nothead=@"\r?\n(?=[;\}\]\):\.\*%=<>\^\&\|\?,]|!=)";
  static Rgx::Regex reg_breaks=new Rgx::Regex(rex_gr_literals+"|^(?:\r?\n)+|"+rex_break_tailsemicolon+"|"+rex_break_nottail+"|"+rex_break_nothead);

  public static string CutComment(string str) {
    // ※ '//' で始まるコメントに ",' が含まれている場合には無視される
    str=reg_comment.Replace(str,delegate(Rgx::Match m){
      if(m.Groups["string"].Success)return m.Value;
      return "\n";
    });
/*
    str=reg_empline.Replace(str,"\r\n");
    str=reg_strline.Replace(str,"");
/*/
    str=reg_spaces.Replace(str,delegate(Rgx::Match m){
      if(m.Groups["string"].Success)return m.Value;
      if(m.Groups["empline"].Success)return "\n";
      if(m.Groups["space"].Success)return " ";
      if(m.Groups["delete"].Success)return "";
      return m.Value;
    });
//*/

    str=reg_breaks.Replace(str,delegate(Rgx::Match m){
      if(m.Groups["string"].Success)return m.Value;
      return "";
    });

    return str;
  }

  // 文字列化
  static Rgx::Regex reg_quote_escape=new Rgx::Regex(
    @"\r\n|[\\\r\n\""\']",
    Rgx::RegexOptions.Compiled
    );
  public static string EscapeDoubleQuote(string content){
    return reg_quote_escape.Replace(content,delegate(Rgx::Match m){
      switch(m.Value[0]){
        case '\\':return @"\\";
        case '\r':
        case '\n':return @"\n";
        case '\"':return @"\""";
        default:return m.Value;
      }
    });
  }
  public static string EscapeSingleQuote(string content){
    return reg_quote_escape.Replace(content,delegate(Rgx::Match m){
      switch(m.Value[0]){
        case '\\':return @"\\";
        case '\r':
        case '\n':return @"\n";
        case '\'':return @"\'";
        default:return m.Value;
      }
    });
  }

  // 単純な改行の削除
  static Rgx::Regex reg_line=new Rgx::Regex(@"\r?\n|\r",Rgx::RegexOptions.Compiled);
  public static string RemoveLineBreaks(string content){
    return reg_line.Replace(content,"");
  }
}
