// -*- coding:utf-8 -*-
using Rgx=System.Text.RegularExpressions;
public static class RexJS{
	// JavaScript コメント
	public const string rex_comment_sl=@"//.*?$";
	public const string rex_comment_ml=@"(?>/\*[\s\S]*?\*/)";
	public const string rex_comment=rex_comment_ml+"|"+rex_comment_sl;

	// JavaScript リテラル
	public const string rex_lit_qstr=@"(?>""(?:[^""\\\r\n]|\\.)*"")";
	public const string rex_lit_dstr=@"(?>'(?:[^'\\\r\n]|\\.)*')";
	public const string rex_lit_str=rex_lit_qstr+@"|"+rex_lit_dstr;
	public const string rex_lit_hnum=@"\b0x[0-9a-fA-F]+\b";

  // if 文の中にコメントや正規表現がある場合に対応していない。また、assertion 内でキャプチャを使用できるのかも謎。
  // //                                                                      (_________) (_______________)
  private const string _rexRegexLiteralHeadIf=@"\b(?:if|while|for)\s*\((?:(?<open>\()|(?<close-open>\))|[^'""()]|"+rex_lit_str+@")*(?(open)(?!))\)";
  //private const string _rexRegexLiteralHeadIf=@"\b(?:if|while|for)\s*\((?:[^'""()]|"+rex_lit_str+@")*\)";
  private const string _rexRegexLiteralHead=@"(?:^|\b(?:delete|void|typeof|instanceof|in|case|return|throw|break|do|else)|[^\w\)\]]|"+_rexRegexLiteralHeadIf+@")(?:\+\+|--|\s)*";
	public const string rex_lit_rex=@"(?>(?<="+_rexRegexLiteralHead+@")/(?!\*)(?:[^/\r\n\\]|\\.)+/)";

	const string rex_opbra=@"(?<openbrace>\{)";
	const string rex_clbra=@"(?<closebrace-openbrace>\})";
	public const string rex_nobrace="(?>"+rex_comment+"|"+rex_lit_str+"|"+rex_lit_rex+@"|[^""'\{\}])*";
	public const string rex_braced=@"\{(?:(?<openbrace>\{)|(?<closebrace-openbrace>\})|(?>"+rex_nobrace+@"))+?(?(openbrace)(?!))\}";
	public const string rex_braces=@"(?>"+rex_nobrace+rex_opbra+@"|"+rex_nobrace+rex_clbra+@")*?(?(openbrace)(?!))"+rex_nobrace;
}
