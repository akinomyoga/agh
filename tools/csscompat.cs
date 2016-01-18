using Rgx=System.Text.RegularExpressions;
using Gen=System.Collections.Generic;

public static class Program{
	public static void Main(string[] args){
		Setting s=new Setting(args);
		if(s.InputFile==null){
			System.Console.WriteLine("! �L���ȓ��̓t�@�C�����w�肳��Ă��܂���B�I�����܂��B");
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
		System.Console.WriteLine(". '{0}' �ɏo�͂����܂����B",outputfile);
	}

	const string rex_0braces	=@"(?:"+rex_nobrace+@")+";
	const string rex_1braces	=@"(?:"+rex_0braces+@"|\{"+rex_0braces+@"\})+";

	const string rex_quotedstr	=@"""(?:[^""\\]|\\.)*""|'(?:[^'\\]|\\.)*'";
	const string rex_comment	=@"\/\*(?!\#)(?:[^\*]|\*(?!\/))+\*\/"; // /*# .. */ �ȊO�̃R�����g
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
        �u���E�U�݊��� CSS ������                     copyright 2009, K. Murase
===============================================================================
�u���E�U�ʂ� CSS ��p�ӂ��������ɕ����L�q����͖̂ʓ|�������B�Ȃ̂ŁA��� css
�t�@�C���̒��ɓZ�߂ċL�q���s���Ďd�����A���̌�ŕ�����������B���ׂ̈̕��B

����)

�� �g����
  >csscompat <css �t�@�C����:sample.css>

utf-8 �ŕۑ����ꂽ sample.css ����A
�Esample.ie.css /* for Trident */
�Esample.fx.css /* for Gecko */
�Esample.sf.css /* for WebKit */
�̎O�̃t�@�C�����o�͂��܂��B

�� �Z�߂ċL�q���s�� css �̏����� (��)
----------------------------------------------------
  @compat(gecko){
     /* Firefox �p�̃t�@�C���ɂ����o�͂��镔�� */
     toge{toge:toge;}
     ...
  }

  /* ���ʕ��� */
  hoge{hoge:hoge;}
  ...

  @compat(trident){
    /* IE �p�̃t�@�C���ɂ����o�� */
    hone{hone:hone;}
    ...
  }

  @compat(webkit){
    /* WebKit �p�̃t�@�C���ɂ����o�� */
    koge{koge:koge;}
    ...
  }
----------------------------------------------------
                                                                             ��
");
	}
}

public class Setting{
	private string directory="";
	/// <summary>
	/// ���̓t�@�C���̃p�X��ێ����܂��B
	/// </summary>
	private string input=null;
	/// <summary>
	/// ���̓t�@�C���̃p�X���擾���͐ݒ肵�܂��B
	/// </summary>
	public string InputFile{
		get{return this.input;}
		set{
			if(!System.IO.File.Exists(value)){
				System.Console.WriteLine("setting> �t�@�C�� '{0}' �͑��݂��܂���B",value);
				value+=".css";
				if(!System.IO.File.Exists(value))return;
				System.Console.WriteLine("setting> �t�@�C�� '{0}' �Ɖ��߂��܂��B",value);
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
	/// �w�肵���R�}���h���C���������g�p���� Setting �̏����������s���܂��B
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
						System.Console.WriteLine("setting> �I�v�V���� -{0} �͔F���ł��܂���B",arg);
						break;
				}
			}else{
				this.InputFile=a;
			}
		}
	}
}