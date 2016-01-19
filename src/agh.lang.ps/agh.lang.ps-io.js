  agh.Namespace('Filters',ns);
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //	ファイル
  //----------------------------------------------------------------------------
  ns.PsFile=agh.Class(nsName+".PsFile",null,{
    name:'abstract',
    iC:1,
    iL:1,
    c:null,
    next:function(){return null;},
    close:function(){},
    getPositionDesc:function(){
      return this.name+':'+this.iL+'.'+this.iC;
    }
  });
  ns.PsStringFile=agh.Class(nsName+".PsStringFile",ns.PsFile,{
    constructor:function(name,text){
      this.base();
      if(arguments.length==2){
        this.name=name;
      }else if(arguments.length==1){
        this.name='noname';
        var text=name;
      }
      
      this.s=text;
      this.l=text.length;
      this.i=-1;
      this.next();
      this.iC=1;
    },
    next:function override(){
      if(++this.i<this.l){
        var fbr=this.c=='\n';
        var c=this.s.charAt(this.i);
        if(c=='\r'&&this.s.charAt(this.i+1)!='\n')c='\n';
        
        // 行・列番号
        if(fbr){
          this.iL++;
          this.iC=1;
        }else
          this.iC++;
          
        return this.c=c;
      }else
        return this.c=null;
    },
    close:function override(){
      this.i=text.length;
      this.c=null;
    },
    seek:function(index){
      this.i=index;
      return this.c=index<this.l?this.s.charAt(index):null;
    }
  });
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //	字句解析
  //----------------------------------------------------------------------------
  (function agh_lang_ps_initialize_scanners(){
    var reg_isspace=/[ \t\f\v\b\r\n]/;
    var reg_ispssym=/[^ \t\f\v\b\n\r\<\>\(\)\[\]\{\}\%\/]/;
    var reg_tot=(function(){
      var reg_comment=/\%[^\r\n]*(?:\r?\n|\r|$)/g;
      var reg_imed   =/\/\/[^\s\<\>\(\)\[\]\{\}\%\/]*/g;
      var reg_name   =/\/[^\s\<\>\(\)\[\]\{\}\%\/]*/g;
      var reg_exec   =/\<\<|\>\>|\[|\]/g;
      var reg_mark   =/[\(\)\{\}\<\>]/g;
      var reg_B      =/(?:(?=[\s\<\>\(\)\[\]\{\}\%\/])|$)/g
      var reg_int    =/[-+]?\d+B/g;
      var reg_flt    =/[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?B/g;
      var reg_hex    =/(\d+)\#([\da-zA-Z]+)B/g;
      var reg_tok    =/[^\s\<\>\(\)\[\]\{\}\%\/]+/g;
      var reg_space  =/\s*/g;
      return new RegExp(
        '({0})(({1})|({2})|({3})|({4})|({5})|({6}|{7})|({8})|({9})|\\S)'.format(
          reg_space.source,   // 0  1
          reg_comment.source, // 1  3
          reg_imed.source,    // 2  4
          reg_name.source,    // 3  5
          reg_exec.source,    // 4  6
          reg_mark.source,    // 5  7
          reg_int.source,     // 6  8
          reg_flt.source,     // 7  8
          reg_hex.source,     // 8  9
          reg_tok.source      // 9 12
/*
          #%data REG_SPACE    1
          #%data REG_TOKEN    2
          
          #%data REGC_COMMENT   3
          #%data REGC_IMEDIATE  4
          #%data REGC_NAME      5
          #%data REGC_EXECMARK  6
          #%data REGC_MARK      7
          #%data REGC_NUMBER    8
          #%data REGC_HEXNUM    9
          #%data REGC_EXECNAME 12
*/
        ).replace(/B/g,reg_B.source),
        'g'
      );
    })();

    ns.ScannerF=function(file,parent){
      if(agh.is(file,String))
        this.file=new ns.PsStringFile(file);
      else
        this.file=file;
      
      if(parent!=null)
        this.errstream=function(text){
          parent.errstream(text);
        };
        
      if(this.file instanceof ns.PsStringFile)
        this.next=this.next4strfile;
    };
    agh.memcpy(ns.ScannerF.prototype,{
      onerror:function(msg){
        this.errstream("("+this.file.name+":"+this.file.iL+"."+this.file.iC+"): "+msg);
      },
      errstream:function(){},
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
      next:function(){
        var c=this.file.c;
        // skip whitespaces
        while(c!=null&&reg_isspace.test(c))c=this.file.next();
        
        this.word='';
        var w_iC=this.file.iC;
        var w_iL=this.file.iL;
        
        if(c==null){
          return null;
        //-------------------------------------------
        //  Comment
        }else if(c=='%'){
          c=this.file.next();
          while(c!=null&&c!='\n'&&c!='\r'){
            this.word+=c;
            c=this.file.next();
          }
          this.word=new ns.PsComment(this.word);
        //-------------------------------------------
        //  Name
        }else if(c=='/'){
          c=this.file.next();
          var imediate=c=='/';
          if(imediate)
            c=this.file.next();
            
          while(c!=null&&reg_ispssym.test(c)){
            this.word+=c;
            c=this.file.next();
          }
          
          this.word=new ns.PsName(this.word);
          if(imediate){
            this.word.__xaccess__=true;
            this.word.__imediate__=true;
          }
        //-------------------------------------------
        //  String
        }else if(c=='('){
          this.file.next();
          this.read_string();
          this.word=new ns.PsString(this.word);
        //-------------------------------------------
        //  Marks
        }else if(c=='{'){
          this.word=MARK_PROC_BEGIN;
          this.file.next();
        }else if(c=='}'){
          this.word=MARK_PROC_END;
          this.file.next();
        }else if(c=='['||c==']'){
          this.word=new ns.PsName(c);
          this.word.__xaccess__=true;
          this.file.next();
        }else if(c=='<'){
          c=this.file.next();
          if(c=='<'){
            this.word=new ns.PsName('<<');
            this.word.__xaccess__=true;
            this.file.next();
          }else if(c=='~'){
            this.onerror("notimplemented: ascii85encoding");
            this.word=new ns.PsString('');
          }else{
            this.read_hexstring();
            this.word=new ns.PsString(this.word);
          }
        }else if(c=='>'){
          this.word=c;
          if(this.file.next()=='>'){
            this.file.next();
            this.word+='>';
          }
          this.word=new ns.PsName(this.word);
          this.word.__xaccess__=true;
        //-------------------------------------------
        //  Tokens
        }else{
          //window.log('dbg: c="'+c+'"');
          while(c!=null&&reg_ispssym.test(c)){
            this.word+=c;
            c=this.file.next();
          }
          //window.log('dbg: token='+this.word);
          //window.log('dbg: c="'+c+'"');
          var m=null;
          if(/^[-+]?\d+$/.test(this.word)){
            this.word=parseInt(this.word);
          }else if(/^[-+]?(\d+(?:\.\d*)?|\.\d+)([eE][-+]?\d+)?$/.test(this.word)){
            // 符号: [+-]?
            // 数値:  \d+|\d+.|\d+.\d+|.\d+
            // 指数部: [eE][+-]?\d+
            this.word=parseFloat(this.word);
          }else if(m=/^(\d+)\#([\da-zA-Z]+)$/.exec(this.word)){
            this.word=parseInt(m[2],parseInt(m[1]));
          }else{
            this.word=new ns.PsName(this.word);
            this.word.__xaccess__=true;
          }
        }
        
        this.word.file =this.file.name;
        this.word.iL=w_iL;
        this.word.iC =w_iC;
        return this.word;
      },
      //----------------------------------------------------
      //  文字列読み取り関数
      read_string:function(){
        // assume(this.file.c == "the character next to the (");
        var c=this.file.c;
        var lv=0;
        while(c!=null){
          if(c=='\\'){
            c=this.file.next();
            if(c==null){
              this.word+='\\';
              c=this.file.next();
              return;
            }else if(/[0-7]/.test(c)){
              this.word+=String.fromCharCode(this.read_string_octal3());
              c=this.file.c;
            }else if(/[nrtbf\n]/.test(c)){
              this.word+={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f','\n':''}[c];
              c=this.file.next();
            }else{
              this.word+=c;
              c=this.file.next();
            }
          }else{
            if(c=='('){
              lv++;
            }else if(c==')'){
              if(lv--==0){
                c=this.file.next();
                return;
              }
            }
            
            this.word+=c;
            c=this.file.next();
          }
        }
      },
      read_string_octal3:function(){
        var c=this.file.c;
        var code=0;
        for(var digit=0;digit<3;digit++){
          if(c==null||!/[0-7]/.test(c))break;
          code=code*8+parseInt(c);//this.c.charCodeAt(0)-this.CHARCODE_0;
          c=this.file.next();
        }
        return code;
      },
      read_hexstring:function(){
        var lead=null;
        var c=this.file.c;
        
        while(true){
          if(c==null){
            this.onerror("syntaxerror: unexpected EOF in a hexadecimal-string literal.");
            c='>';
          }else if(c=='>'){
            if(lead!=null)
              this.word+=String.fromCharCode(parseInt(lead,16))*4; // '0x[lead]0'
            this.file.next();
            return;
          }else if(/[\da-fA-F]/.test(c)){
            if(lead==null){
              lead=c;
            }else{
              this.word+=String.fromCharCode(parseInt(lead+c,16)); // '0x[lead][c]'
              lead=null;
            }
            c=this.file.next();
          }else if(/\s/.test(c)){
            c=this.file.next();
          }else{
            this.onerror("syntaxerror: invalid character '"+c+"' in hexadecimal string.");
            c=this.file.next();
          }
        }
      },
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
      next4strfile:function(){
        var m;
        if(this.file.i<this.file.l&&(reg_tot.lastIndex=this.file.i,m=reg_tot.exec(this.file.s))){
          //---------------------------
          // this.file.iC/iL 更新
          var s=m[1];
          for(var i=0;i<s.length;i++){
            var c=s.charAt(i);
            if(c=='\r'){
              c='\n';
              if(s.charAt(i+1)=='\n')i++;
            }
            
            if(c=='\n'){
              this.file.iL++;
              this.file.iC=1;
            }else{
              this.file.iC++;
            }
          }
          
#%expand (
          var iC=this.file.iC;
          var iL=this.file.iL;
          this.file.iC+=m[${REG_TOKEN}].length;
          this.file.i=reg_tot.lastIndex;

          //---------------------------
          // 分類
          if(m[${REGC_NUMBER}]){
            this.word=parseFloat(m[${REGC_NUMBER}]);
          }else if(m[${REGC_EXECNAME}]){
            this.word=new ns.PsName(m[${REGC_EXECNAME}]);
            this.word.__xaccess__=true;
          }else if(m[${REGC_NAME}]){
            this.word=new ns.PsName(m[${REGC_NAME}].slice(1));
          }else if(m[${REGC_HEXNUM}]){
            this.word=parseInt(m[${.eval:REGC_HEXNUM+2}],parseInt(m[${.eval:REGC_HEXNUM+1}]));
          }else if(m[${REGC_EXECMARK}]){ // << >> [ ]
            this.word=new ns.PsName(m[${REGC_EXECMARK}]);
            this.word.__xaccess__=true;
          }else if(m[${REGC_IMEDIATE}]){
            this.word=new ns.PsName(m[${REGC_IMEDIATE}].slice(2));
            this.word.__xaccess__=true;
            this.word.__imediate__=true;
          }else if(m[${REGC_MARK}]){
            var c=this.file.seek(this.file.i);
            switch(m[${REGC_MARK}]){
              case '{':
                this.word=MARK_PROC_BEGIN;
                break;
              case '}':
                this.word=MARK_PROC_END;
                break;
              case '(':
                this.word='';
                this.read_string();
                this.word=new ns.PsString(this.word);
                break;
              case '<':
                if(c=='~'){
                  this.onerror("notimplemented: ascii85encoding");
                  this.word=new ns.PsString('');
                }else{
                  this.word='';
                  this.read_hexstring();
                  this.word=new ns.PsString(this.word);
                }
                break;
              case '>':
              case ')':
                this.onerror("syntaxerror: no corresponding open paren for '"+m[7]+"'");
                break;
            }
          }else if(m[${REGC_COMMENT}]){
            this.word=new ns.PsComment(m[${REGC_COMMENT}].slice(1));
            this.file.iL++;
            this.file.iC=1;
          }else{
            // 必ず 13 で引っかかる筈…
            this.word=new ns.PsComment('%Error: Fatal error in agh.PostScript.ScannerF');
            this.onerror("fatalerror: an invalid character in agh.PostScript.ScannerF");
          }
#%).i
          //---------------------------
          // 単語位置情報
          this.word.file=this.file.name;
          this.word.iL=iL;
          this.word.iC=iC;
          return this.word;
        }else
          return null;
      }
      //:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
    });
  })();
  //++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
  //	Eexec Decryption
  //----------------------------------------------------------------------------
  (function(){
    var MAX_COL=80;
    var N=4;
    var C1=52845;
    var C2=22719;
    ns.Filters.EExecDecode=function EExecDecode(data){
      var o=[];
      var r =55665;
      var n=0;
      var i=0;while(/\s/.test(data.charAt(i)))i++;
      if(/[\da-fA-F]/.test(data.slice(i,N))){
        // hexadecimal
        for(;i<data.length;){
          var cL,cR;
          while(i<data.length&&!/[\da-fA-F]/.test(cL=data.charAt(i++)));
          while(i<data.length&&!/[\da-fA-F]/.test(cR=data.charAt(i++)));
          var b1=parseInt(cL+cR,16);
          var b2=b1^r>>8;
          r=(b1+r)*C1+C2&0xFFFF;
          if(n++>=N)o.push(String.fromCharCode(b2));
        }
      }else{
        // binary
        for(;i<data.length;i++){
          var b1=data.charCodeAt(i)&0xFF;
          var b2=b1^r>>8;
          r=(b1+r)*C1+C2&0xFFFF;
          if(n++>=N)o.push(String.fromCharCode(b2));
        }
      }
      return o.join('');
    };
    ns.Filters.EExecDecoder=agh.Class(nsName+'.Filters.EExecDecoder',ns.PsFile,{
      r :55665,
      fCLOSE:false,
      constructor:function(file){
        this.base();
        if(file instanceof ns.PsFile){
          while(/\s/.test(file.c))file.next();
          this.src=file;
          this.name=file.getPositionDesc()+"|eexec";
          this.initialize();
        }else if(file instanceof ns.PsString){
          var str=file;
          var src=ns.Filters.EExecFilter(file.toString());
          var ret=new ns.PsStringFilter(src);
          ret.name=(str.file?'string.'+str.file+":"+str.iL+"."+str.iC:'string')+"|eexec";
          return ret;
        }
      },
      initialize:function(){
        var f=this.src;
        
        // peak head fourcc
        var h=f.c;
        for(var i=1;i<N;i++)h+=f.next();
        var i=0,c;
        function next_ch(){
          c=i<N?h.charAt(i++):f.next();
        }
        next_ch();
        //window.log('dbg: head='+h);
        
        if(/[\da-fA-F]/.test(h)){
          // hexadecimal
          this.nextc=this.nextc_hex;
          
          // N+1 文字目に移動
          for(var n=0;n<N+1;n++){
            var cL,cR;
            while(c!=null&&!/[\da-fA-F]/.test(c))next_ch();
            var cL=c;next_ch();
            while(c!=null&&!/[\da-fA-F]/.test(c))next_ch();
            var cR=c;next_ch();
            
            var b1=parseInt(cL+cR,16);
            var b2=b1^this.r>>8;
            this.r=(b1+this.r)*C1+C2&0xFFFF;
            this.c=String.fromCharCode(b2);
          }
        }else{
          // binary
          this.nextc=this.nextc_bin;
          
          for(var n=0;n<N+1;n++){
            var b1=c.charCodeAt(0)&0xFF;next_ch();
            var b2=b1^this.r>>8;
            this.r=(b1+this.r)*C1+C2&0xFFFF;
            this.c=String.fromCharCode(b2);
          }
        }
      },
      close:function override(){
        this.fCLOSE=true;
      },
      next:function override(){
        if(this.fCLOSE)return null;
        
        // 改行正規化
        if(this.c=='\n'){
          this.nextc();
          if(this.fCR&&this.c=='\n')this.nextc();
          this.iL++;
          this.iC=1;
        }else{
          this.nextc();
          this.iC++;
        }
        
        if(this.fCR=this.c=='\r')this.c='\n';
        return this.c;
      },
      nextc_hex:function(){
        var c=this.src.c;
        var cL,cR;
        while(c!=null&&!/[\da-fA-F]/.test(c))c=this.src.next();
        var cL=c;c=this.src.next();
        while(c!=null&&!/[\da-fA-F]/.test(c))c=this.src.next();
        var cR=c;c=this.src.next();
        if(cL!=null&&cR!=null){
          var b1=parseInt(cL+cR,16);
          var b2=b1^this.r>>8;
          this.r=(b1+this.r)*C1+C2&0xFFFF;
          this.c=String.fromCharCode(b2);
        }else{
          this.c=null;
        }
      },
      nextc_bin:function(){
        var c=this.src.c;
        if(c!=null){
          var b1=c.charCodeAt(0)&0xFF;this.src.next();
          var b2=b1^this.r>>8;
          this.r=(b1+this.r)*C1+C2&0xFFFF;
          this.c=String.fromCharCode(b2);
        }else{
          this.c=null;
        }
      }
    });
    ns.Filters.EExecEncode=function EExecEncode(data,fBIN){
      var o=[];
      var r=55665;
      var n=0;
      if(!fBIN){
        // random numbers
        for(var n=0;n<N;n++){
          var hex=(Math.random()*256&0xFF).toString(16);
          o.push(hex.length==1?'0'+hex:hex);
        }
        // hexadecimal encodings
        for(var i=0;i<data.length;){
          var bP=data.charCodeAt(i)&0xFF;
          var bC=bP^r>>8;
          r=(bC+r)*C1+C2&0xFFFF;
          var hex=bC.toString(16);
          o.push(hex.length==1?'0'+hex:hex);
          if(n++%MAX_COL==0)o.push('\n');
        }
      }else{
        // random numbers in [0x80,0xFF]
        for(var n=0;n<N;n++){
          var c=Math.random()*256&0xFF|0x80;
          o.push(String.fromCharCode(c));
        }
        // binary
        for(var i=0;i<data.length;i++){
          var bP=data.charCodeAt(i)&0xFF;
          var bC=bP^r>>8;
          r=(bC+r)*C1+C2&0xFFFF;
          o.push(String.fromCharCode(bC));
        }
      }
      return o.join('');
    };
    ns.Filters.ASCII85Encode=function ASCII85Encode(data){
      var o=[];var n=0;
      for(var i=0;i+3<data.length;i+=4){
        // read
        var t=0;
        for(var j=0;j<4;j++)
          t=t<<8|data.charCodeAt(i+j)&0xFF;
        
        // write
        if(t==0){
          o.push('z');
          if(n++%MAX_COL==0)o.push('\n');
        }else{
          var cc=[];
          for(var j=4;j>=0;cc[j--]=t%85,t=t/85^0);
          for(var j=0;j<5;j++){
            o.push(String.fromCharCode(33+c[j]));
            if(n++%MAX_COL==0)o.push('\n');
          }
        }
      }
      
      // 端
      {
        var r=data.length-i;
        var t=0;
        for(var j=0;j<r;j++)t=t<<8|data.charCodeAt(i+j)&0xFF;
        for(;j<4;j++)t<<=8;
        
        var cc=[];
        for(var j=4;j>=0;cc[j--]=t%85,t=t/85^0);
        for(var j=0;j<=r;j++){
          o.push(String.fromCharCode(33+c[j]));
          if(n++%MAX_COL==0)o.push('\n');
        }
      }
      
      o.push("~>");
      return o.join('');
    };
  })();

