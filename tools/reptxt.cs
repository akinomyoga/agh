// -*- coding:utf-8 -*-
using Rgx=System.Text.RegularExpressions;
using Diag=System.Diagnostics;
using Gen=System.Collections.Generic;

public static class Program {
	public static void Main(string[] args){
		System.Console.WriteLine("--------------------------------------------------");
		System.Console.WriteLine("  Regex Replace         copyright 2009, kch.murase");
		System.Console.WriteLine("--------------------------------------------------");
		Argument cmdline=new Argument(args);
		if(cmdline.InputFile==null){
			System.Console.WriteLine("! 有効な入力ファイルが指定されていないので終了します。");
			return;
		}
		if(cmdline.OutputFile==null){
			System.Console.WriteLine("! 有効な出力ファイルが指定されていないので終了します。");
			return;
		}
		if(cmdline.Before==null||cmdline.After==null){
			System.Console.WriteLine("! 置換に関する情報が不完全です。");
			return;
		}

		Rgx::Regex reg;
		try{
			reg=new Rgx::Regex(cmdline.Before,Rgx::RegexOptions.Multiline);
		}catch{
			System.Console.WriteLine("! 正規表現に誤りが含まれている可能性があります。");
			System.Console.WriteLine("!> 指定された正規表現 == {0}",cmdline.Before);
			return;
		}
		System.Console.WriteLine("file '{0}' に対する処理を実行します。",cmdline.InputFile);
		string content=System.IO.File.ReadAllText(cmdline.InputFile,System.Text.Encoding.UTF8);
		content=reg.Replace(content,delegate(Rgx::Match m){
			return cmdline.GetProcessedAfter(m);
		});

		string outfile=cmdline.OutputFile;
		System.IO.File.WriteAllText(outfile,content,System.Text.Encoding.UTF8);
		System.Console.WriteLine("処理結果が無事に '"+outfile+"' に出力されました");
	}
}

public class Argument{
	string filename=null;
	string directory="";
	public string InputFile{
		get{return this.filename;}
		set{
			this.filename=value;
			this.directory=System.IO.Path.GetDirectoryName(value);
		}
	}

	string outputfile=null;
	public string OutputFile{
		get{
			if(this.filename==null)return this.outputfile;
			return System.IO.Path.Combine(this.directory,this.outputfile);
		}
	}

	string before=null;
	public string Before{
		get{return this.before;}
	}
	string after=null;
	public string After{
		get{return this.after;}
	}

	public string GetProcessedAfter(Rgx::Match match){
		string ret=this.after;
		ret=reg_after.Replace(ret,delegate(Rgx::Match m){
			//System.Console.WriteLine("replacement match: "+m.Value);
			if(m.Groups["num"].Success){
				int n=int.Parse(m.Groups["num"].Value);
				if(n==0)
					return match.Value;
				Rgx::Group g=match.Groups[n];
				if(g!=null&&g.Success)
					return g.Value;
			}else if(m.Groups["name"].Success){
				Rgx::Group g=match.Groups[m.Groups["name"].Value];
				if(g!=null&&g.Success)
					return g.Value;
			}else switch(m.Groups["cmd"].Value){
				case "include":
					string fname=m.Groups["arg"].Value.Trim();
					fname=System.IO.Path.Combine(this.directory,fname);
					if(!System.IO.File.Exists(fname))break;
					return System.IO.File.ReadAllText(fname);
			}
			return m.Value;
		});
		return ret;
	}

	public bool test=false;
	public bool IsTest{
		get{return this.test;}
	}

	static Rgx::Regex reg_after=new Rgx::Regex(
		@"\$(?<num>\d)|\$\{(?<name>\w+)\}|\$\{(?<cmd>\w+)\:(?<arg>[^\}]*)\}",
		Rgx::RegexOptions.Compiled
		);
	//============================================================
	//	初期化
	//============================================================
	/// <summary>
	/// コマンドライン引数から初期化を実行します。
	/// </summary>
	/// <param name="args"></param>
	public Argument(string[] args){
		string file=null;

		foreach(string str in args){
			if(str[0]=='/'||str[0]=='-'){
				string a=str.Substring(1).ToLower();
				if(a.StartsWith("o:")){
					this.outputfile=str.Substring(3);
				}else if(a.StartsWith("reg:")){
					a=str.Substring(5);
					int i=1;
					int s=-1;
					while(i<a.Length){
						s=a.IndexOf('/',i);

						// / が無い時
						if(s<0){
							System.Console.WriteLine("置換指定が誤っています。\n/reg:置換前/置換後 の形式で指定して下さい");
							break;
						}

						// 検索のやり直し
						if(a[s-1]=='\\'){
							i=s+1;
							continue;
						}

						break;
					}

					if(s>=0){
						before=a.Substring(0,s);
						after=Rgx::Regex.Unescape(a.Substring(s+1));
						System.Console.WriteLine("before == {0}",before);
						System.Console.WriteLine("after == {0}",after);
					}
				}else if(a.StartsWith("i:")){
					file=str.Substring(3);
				}else switch(a){
					case "test":
						this.test=true;
						break;
				}
				continue;
			}else{
				file=str;
				continue;
			}
		}

		// file 引数の検査
		if(file==null){
			System.Console.WriteLine("引数には file 名を指定して下さい。");
			goto comp;
		}

		if(System.IO.File.Exists(file))goto comp;
		System.Console.WriteLine("file '{0}' は存在しません。",file);
		file=null;

	comp:
		this.InputFile=file;
	}
}
