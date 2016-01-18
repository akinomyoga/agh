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
			System.Console.WriteLine("! �L���ȓ��̓t�@�C�����w�肳��Ă��Ȃ��̂ŏI�����܂��B");
			return;
		}
		if(cmdline.OutputFile==null){
			System.Console.WriteLine("! �L���ȏo�̓t�@�C�����w�肳��Ă��Ȃ��̂ŏI�����܂��B");
			return;
		}
		if(cmdline.Before==null||cmdline.After==null){
			System.Console.WriteLine("! �u���Ɋւ����񂪕s���S�ł��B");
			return;
		}

		Rgx::Regex reg;
		try{
			reg=new Rgx::Regex(cmdline.Before,Rgx::RegexOptions.Multiline);
		}catch{
			System.Console.WriteLine("! ���K�\���Ɍ�肪�܂܂�Ă���\��������܂��B");
			System.Console.WriteLine("!> �w�肳�ꂽ���K�\�� == {0}",cmdline.Before);
			return;
		}
		System.Console.WriteLine("file '{0}' �ɑ΂��鏈�������s���܂��B",cmdline.InputFile);
		string content=System.IO.File.ReadAllText(cmdline.InputFile,System.Text.Encoding.UTF8);
		content=reg.Replace(content,delegate(Rgx::Match m){
			return cmdline.GetProcessedAfter(m);
		});

		string outfile=cmdline.OutputFile;
		System.IO.File.WriteAllText(outfile,content,System.Text.Encoding.UTF8);
		System.Console.WriteLine("�������ʂ������� '"+outfile+"' �ɏo�͂���܂���");
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
	//	������
	//============================================================
	/// <summary>
	/// �R�}���h���C���������珉���������s���܂��B
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

						// / ��������
						if(s<0){
							System.Console.WriteLine("�u���w�肪����Ă��܂��B\n/reg:�u���O/�u���� �̌`���Ŏw�肵�ĉ�����");
							break;
						}

						// �����̂�蒼��
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

		// file �����̌���
		if(file==null){
			System.Console.WriteLine("�����ɂ� file �����w�肵�ĉ������B");
			goto comp;
		}

		if(System.IO.File.Exists(file))goto comp;
		System.Console.WriteLine("file '{0}' �͑��݂��܂���B",file);
		file=null;

	comp:
		this.InputFile=file;
	}
}
