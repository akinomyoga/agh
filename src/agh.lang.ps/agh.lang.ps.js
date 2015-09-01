agh.scripts.register("agh.lang.ps.js",["agh.js","agh.text.js","agh.class.js"],function(){
	agh.Namespace("PostScript",agh);
	var ns=agh.PostScript;
	var nsName='agh.PostScript';
	
	var MARK_PROC_BEGIN={__xaccess__:true,toString:function(){return '--{--';}};
	var MARK_PROC_END={__xaccess__:true,toString:function(){return '--}--';}};
	
	//----------------------------------------------------------------------------
	//	オブジェクト
	//----------------------------------------------------------------------------
	var to_ps=function(obj){
		if(obj==null){
			return null;
		}else if(agh.is(obj,Function)){
			var name=obj.ps_name;
			if(!name){
				name=obj.get_name();
				if(name=='')
					name='<anonymous operator>';
				else if(/^ps_/.test(name))
					name=name.slice(3);
			}
			return "--"+name+"--";
		}else if(agh.is(obj.toPs,Function)){
			return obj.toPs();
		}else{
			return ""+obj;
		}
	};
	//----------------------------------------------------------------------------
	ns.PsArray=function(len){
		if(agh.is(len,Array)){
			this.data=len;
			this.length=this.data.length;
		}else{
			this.length=parseInt(len);
			this.data=[];
			for(var i=0;i<len;i++)this.data[i]=ns.PsNull.instance;
		}
		this.offset=0;
		if(this.data.ver==null)this.data.ver=0;
	};
	agh.memcpy(ns.PsArray.prototype,{
		__raccess__:true,
		__waccess__:true,
		__xaccess__:false,
		__packed__:false,
		__funcver__:-1,
		__psget__:function(proc,key){
			var index=parseInt(key);
			if(isNaN(index)||index<0||this.length<=index){
				proc.onerror("rangeerror","array="+this+", key="+key);
				return null;
			}

			return this.data[this.offset+index];
		},
		__psput__:function(proc,key,val){
			if(!this.__waccess__){
				proc.onerror("invalidaccess","!__waccess__");
				return;
			}
			
			var index=parseInt(key);
			if(isNaN(index)||index<0||this.length<=index){
				proc.onerror("rangeerror","array="+this+", key="+key);
				return;
			}
			
			//proc.onerror("debug","key="+index+", val="+val);
			this.data[this.offset+index]=val;
			/*
				log(parseInt("--"));
				log(isNaN(parseInt("hello")));
			//*/
		},
		toString:function(){
			return '--<array:'+this.length+'>--';
		},
		toPs:function(){
			var ret=[this.__xaccess__?'{':'['];
			for(var i=0;i<this.length;i++){
				ret.push(to_ps(this.data[this.offset+i]));
			}
			ret.push(this.__xaccess__?'}':']');
			return ret.join(' ');
		},
		//--------------------------------------------------------------------------
		compile_function:function(proc){
			return new ns.Optimizer2(proc).compile_function(this);
		},
		execute_function:function(proc){
			if(this.__funcver__!=this.data.ver)
				this.compile_function(proc);
			this.__function__(proc,this.__funcargs__);
		},
		update_function:function(proc){
			if(this.__funcver__!=this.data.ver)
				this.compile_function(proc);
		}
	});
	//----------------------------------------------------------------------------
	ns.PsName=function(name){
		this.name=name;
		this.__xaccess__=false;
		this.__imediate__=false;
	};
	agh.memcpy(ns.PsName.prototype,{
		toString:function(){
			return this.name;
		},
		toPs:function(){
			if(this.__xaccess__)
				return this.name;
			else
				return '/'+this.name;
		}
	});
	ns.PsName.CreateExecutable=function(name){
		var ret=new ns.PsName(name);
		ret.__xaccess__=true;
		return ret;
	};
	//----------------------------------------------------------------------------
	ns.PsNull=function(){
		this.__xaccess__=false;
	};
	ns.PsNull.instance=new ns.PsNull();
	ns.PsNull.executable=new ns.PsNull();
	ns.PsNull.executable.__xaccess__=true;
	agh.memcpy(ns.PsNull.prototype,{
		toString:function(){return "--<null>--";},
		toPs:function(){return "null";}
	});
	//----------------------------------------------------------------------------
	ns.PsMark=function(){};
	ns.PsMark.instance=new ns.PsMark();
	agh.memcpy(ns.PsMark.prototype,{
		toString:function(){return "--<mark>--";},
		toPs:function(){return "mark";}
	});
	//----------------------------------------------------------------------------
	ns.PsComment=function(text){
		this.text=text;
	};
	//----------------------------------------------------------------------------
	ns.PsString=function PsString(text){
		if(agh.is(text,Array)){
			this.data=text;
		}else{
			this.data=text.toString().toCharArray();
		}
		this.offset=0;
		this.length=text.length;
	};
	agh.memcpy(ns.PsString.prototype,{
		__raccess__:true,
		__waccess__:true,
		__xaccess__:false,
		__psget__:function(proc,key){
			var index=parseInt(key);
			if(isNaN(index)||index<0||this.length<=index){
				proc.onerror("rangeerror","string="+this+", key="+key);
				return null;
			}

			return this.data[this.offset+index];
		},
		__psput__:function(proc,key,val){
			var index=parseInt(key);
			if(isNaN(index)||index<0||this.length<=index){
				proc.onerror("rangeerror","string="+this+", key="+key);
				return;
			}
			
			var value=parseInt(val);
			if(isNaN(value)){
				proc.onerror("typecheck","operand 3/3 must be integer. value="+val);
				return;
			}
			
			this.data[this.offset+index]=value;
		},
		toString:function(){
			return String.fromCharArray(this.data).substr(this.offset,this.length);
		},
		toPs:function(){
			return '('+this.toString().replace(/([\(\)])/g,"\\$1")+')';
		}
	});
	//----------------------------------------------------------------------------
	ns.PsDict=function(len){
		this.data={};
		this.length=0;
	};
	agh.memcpy(ns.PsDict.prototype,{
		__waccess__:true,
		__raccess__:true,
		__psget__:function(proc,key){
			key=""+key;
			if(!(key in this.data)){
				proc.onerror("undefined","dict="+this+", key="+key);
				return null;
			}

			return this.data[key];
		},
		__psput__:function(proc,key,val){
			if(!this.__waccess__){
				proc.onerror('invalidaccess',"this dictionary has no waccess.");
				return;
			}
			
			key=""+key;
			// dictionary は agh.wrap 元は更新しないという想定の下
			if(!(key in this.data))this.length++;
			
			this.data[key]=val;
		},
		undef:function(proc,key){
			if(!this.__waccess__){
				proc.onerror('invalidaccess',"this dictionary has no waccess.");
				return;
			}
			
			key=""+key;
			if(key in this.data){
				delete this.data[key];
				this.length--;
			}
		},
		toString:function(){
			return '--<dict:'+this.length+'/'+this.length+'>--';
		},
		toPs:function(){
			return '--<dict:'+this.length+'/'+this.length+'>--';
		},
		toPs2:function(){
			var ret=[];
			ret.push('<<');
			for(var key in this.data){
        var value=this.data[key];
				ret.push('/'+key);
				// ret.push(to_ps(value));
				ret.push(value instanceof ns.PsDict?value.toPs2():to_ps(value));
			}
			ret.push('>>');
			return ret.join(' ');
		},
		update_length:function(){
			/// <summary>
			/// __psput__ を介さずにメンバを追加した場合に呼び出します。
			/// </summary>
			
			// dictionary は実行中に agh.wrap しないという想定の下
			this.length=agh.ownkeys(this.data).length;
			/*
				var o={a:1,b:2};
				log(o.length);
				log(agh.ownkeys);
				log(agh.ownkeys(o).length);
				log(agh.ownkeys(agh.wrap(o)).length);
				log(agh.keys(o).length);
				log(agh.keys(agh.wrap(o)).length);
			//*/
		},
		clear:function(){
			this.data={};
			this.length=0;
		}
	});
	//----------------------------------------------------------------------------
	ns.PsSave=function(proc){
		this.proc=proc;
		this.gsnap=proc.graphics.save_graphics();
	};
	agh.memcpy(ns.PsSave.prototype,{
		restore:function(proc){
			// check
			if(this.proc==null){
				proc.onerror("invalidrestore","the specified snapshot is already used and disposed.");
				return;
			}
			if(this.proc!=proc){
				proc.onerror("invalidrestore","fatal: the specified snapshot is that of different Processor.");
				return;
			}
			
			proc.graphics.restore_graphics(this.gsnap);
			this.proc=null;
		},
		toString:function(){
			return '--<save>--';
		},
		toPs:function(){
			return '--<save>--';
		}
	});
	//----------------------------------------------------------------------------
	//	systemdict / NameLookup
	//----------------------------------------------------------------------------
	ns.systemdict=new ns.PsDict();
	ns.systemdict.__waccess__=false;
	ns.systemdict.data.systemdict=ns.systemdict;
	ns.systemdict.register_operator=function(name,func,optimize2){
		ns.systemdict.data[name]=func;
		func.ps_name=name;
		if(optimize2 instanceof Function)
			func.__optimize2__=optimize2;
	};
  // ns.systemdict.define_operators=function(defs){
  //   var keys=agh.ownkeys(defs);
  //   for(var i=0,iN=keys;i<iN;i++){
  //     var ent=defs[keys[i]];
  //     //@@2013-11-06@ operator, __optimize2__ 等を一箇所で定義したい。
  //   }
  // };
	//----------------------------------------------------------------------------
	ns.Scope=function(){
		this.dicts=[];
		this.userdict=new ns.PsDict();
		this.globaldict=new ns.PsDict();
		this.systemdict=new ns.PsDict();
		
		this.systemdict.data=agh.wrap(ns.systemdict.data,{
			userdict:this.userdict,
			globaldict:this.globaldict
		});
		this.systemdict.length=ns.systemdict.length+2;
		this.push_dict(this.globaldict);
		this.push_dict(this.userdict);
	};
	agh.memcpy(ns.Scope.prototype,{
		get_val:function(proc,key){
			for(var i=this.dicts.length-1;i>=0;i--){
				var d=this.dicts[i].data;
				if(key in d)return d[key];
			}
			/*
			return this.systemdict.__psget__(proc,key);
			/*/
			if(key in this.systemdict.data)
				return this.systemdict.data[key];
				
			proc.onerror("undefined","key="+key+" @ dictstack");
			return null;
			//*/
		},
		set_val:function(proc,key,value){
			this.dicts[this.dicts.length-1].__psput__(proc,key,value);
		},
		where:function(key){
			for(var i=this.dicts.length-1;i>=0;i--){
				var d=this.dicts[i];
				if(key in d.data)return d;
			}
			if(key in this.systemdict.data)
				return this.systemdict;
			return null;
		},
		push_dict:function(dict){
			this.dicts.push(dict);
		},
		pop_dict:function(proc){
			if(this.dicts.length<=2){
				proc.onerror("dictstackunderflow");
				return;
			}
			return this.dicts.pop();
		},
		top_dict:function(){
			return this.dicts[this.dicts.length-1];
		},
		clear_dict:function(){
			this.dicts.length=2;
		},
		TryGetValue:function(proc,key){
			for(var i=this.dicts.length-1;i>=0;i--){
				var d=this.dicts[i].data;
				if(key in d)return d[key];
			}
			if(key in this.systemdict.data)
				return this.systemdict.data[key];
			return null;
		}
	});
#%include "agh.lang.ps-opt.js"
#%include "agh.lang.ps-io.js"
#%include "agh.lang.ps-cmd.js"
	//****************************************************************************
	//	Graphics
	//----------------------------------------------------------------------------
	var PATH_LINE =1;
	var PATH_CBEZ =2;
	var PATH_CLOSE=3;
	var PATH_CHAR =4;
	
	var LNCAP_BUTT=0;
	var LNCAP_ROUND=1;
	var LNCAP_SQUARE=2;
	
	var LNJOIN_MITER=0;
	var LNJOIN_ROUND=1;
	var LNJOIN_BEVEL=2;
	
	//----------------------------------------------------------------------------
	ns.color=function(r,g,b){
		if(arguments.length==3){
			this.r=this.norm_intensity(r);
			this.g=this.norm_intensity(g);
			this.b=this.norm_intensity(b);
		}
	};
	agh.memcpy(ns.color.prototype,{
		r:0,
		g:0,
		b:0,
		norm_intensity:function(value){
			if(value==null)return 0;
			value=parseFloat(value);
			if(value<0)return 0;
			if(value>1)return 1;
			return value;
		},
		intensity_hex:function(value){
			value=0|(value*255+0.5);
			
			// 例外値
			if(value<0)return '00';
			if(value>255)return 'FF';
			
			// 整形
			value=value.toString(16).toUpperCase();
			if(value.length==1)value='0'+value;
			return value;
		},
		toHtmlColor:function(){
			return '#'
				+this.intensity_hex(this.r)
				+this.intensity_hex(this.g)
				+this.intensity_hex(this.b);
		},
		toHSV:function(){
			var a=[this.r,this.g,this.b];
			
			var m=0,v=a[m];
			if(v<a[1])m=1,v=a[1];
			if(v<a[2])m=2,v=a[2];
			var t=a[(m+1)%3];
			var u=a[(m+2)%3];
			var d=v-Math.min(t,u);
			var s=d/v;
			var h=((t-u)/d+2*m)/6;
			
			return [h,s,v];
		},
		toCMYK:function(){
			var k=Math.min(Math.min(1-this.r,1-this.g),1-this.b);
			var ik=1-k;
			return [1-this.r/ik,1-this.g/ik,1-this.b/ik,k];
		},
		toGray:function(){
			var gr=this.r*0.299+this.g*0.587+this.b*0.114;
			// γ補正
			//gr=gr<0.018?gr*4.5:1.099*Math.pow(gr,0.45)-0.099;
			return gr;
		}
	});
	agh.memcpy(ns.color,{
		DeviceRGB:new ns.PsArray([new ns.PsName('DeviceRGB')]),
		DeviceGray:new ns.PsArray([new ns.PsName('DeviceGray')]),
		DeviceCMYK:new ns.PsArray([new ns.PsName('DeviceCMYK')]),
		fromHSV:function(h,s,v){
			h-=Math.floor(h);h*=6; // h in [0,6)
			var m=h>>1;
			var i=1^h&1;
			var a=[0,0,0];
			a[(m+i)%3]=Math.abs(2*m+1-h);
			a[(m+2)%3]=1;
			return new ns.color(v*(1-s*a[0]),v*(1-s*a[1]),v*(1-s*a[2]));
		},
		fromCMYK:function(c,m,y,k){
			var ik=1-k;
			return new ns.color(ik*(1-c),ik*(1-m),ik*(1-y));
		},
		fromGray:function(gr){
			// γ補正
			//gr=gr<0.0812?gr/4.5:Math.pow((gr+0.099)/1.099,1/0.45);
			return new ns.color(gr,gr,gr);
		}
	});
	//----------------------------------------------------------------------------
	ns.PsGState=function(){
		this.CTM=agh.Array.clone(ns.AffineA.defaultMatrix);
		this.path=[];
		this.clipstack=[];  // to impl
		
		this.font=ns.PsNullFont.instance;
	};
	agh.memcpy(ns.PsGState.prototype,{
		CTM:[],                 //       array
		position:null,          // const array
		path:[],                //       array 
		clippath:null,          // const array : to impl
		clipstack:null,         //       array : to impl
		color:new ns.color(),
		colorspace:ns.color.DeviceGray,
		font:null,
		linewidth:1.0,
		linecap:0,
		linejoin:0,
		miterlimit:10,
		linedash:agh.memcpy([],{dashoffset:0}),  // const array
		strokeadjust:false,      // to impl
		// Device dependent paramters (未実装)
		color_rendering:null,    // to impl
		overprint:false,         // to impl
		black_generation:null,   // to impl
		undercolor_removal:null, // to impl
		transfer:null,           // to impl
		halftone:null,           // to impl
		flatness:null,           // to impl
		smoothness:null,         // to impl
		device:null,             // to impl
		//------------------------------------------------------
		clone:function(){
			var ret=agh.wrap(this,this);
			ret.path=agh.Array.clone(this.path);
			ret.clipstack=agh.Array.clone(this.clipstack);
			ret.CTM=agh.Array.clone(this.CTM);
			return ret;
		},
		toString:function(){return "--<gstate>--";},
		dump:function(){
			var buff=['{'];
			buff.push('  CTM=['+this.CTM+']');
			buff.push('  position=('+this.position+')');
			buff.push('  path=['+this.path+']');
			buff.push('  clippath=['+this.clippath+']');
			buff.push('  clipstack=['+this.clipstack+']');
			buff.push('  color='+this.color.toHtmlColor());
			buff.push('  colorspace='+this.colorspace.toPs()+'');
			buff.push('}');
			return buff.join('\n');
		}
	});
	//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	ns.GraphicsBase=agh.Class(nsName+'.GraphicsBase',null,{
		constructor:function(){
			this.base();
			this.gstate=new ns.PsGState();
			this.gstack=[];
		},
		m_width:"200px",
		m_height:"200px",
		m_bbl:0,
		m_bbb:0,
		m_bbw:612,
		m_bbh:792,
		SetDisplaySize:function(w,h){
			this.m_width=w;
			this.m_height=h;
		},
		SetBoundingBox:function(l,b,r,t){
			this.m_bbl=l;
			this.m_bbb=b;
			this.m_bbw=r-l;
			this.m_bbh=t-b;
		},
		getMeanScale:function(){
			var A=this.gstate.CTM;
			return Math.sqrt(Math.abs(A[0]*A[3]-A[1]*A[2]));
		},
		//------------------------------------------------------
		// save/restore VM
		save_graphics:function(){
			var gstack_=[];
			for(var i=0;i<this.gstack.length;i++)
				gstack_[i]=this.gstack[i].clone();
			return {gstate:this.gstate.clone(),gstack:gstack_};
		},
		restore_graphics:function(snapshot){
			this.gstate=snapshot.gstate;
			this.gstack=snapshot.gstack;
		},
		//------------------------------------------------------
		ginit:function(){
			this.gstate=new ns.PsGState();
		},
		gsave:function(){
			/*
			//++++++++++++++++++++++++++++++++++++++++++++++++++++
			// ループ内で↓をやるとどんどん wrap が深くなるので×
			this.gstack.push(agh.wrap(this.gstate));
			this.gstate=agh.wrap(this.gstate,{
				path:agh.Array.clone(this.gstate.path),
				clipstack:agh.Array.clone(this.gstate.clipstack)
			});
			//++++++++++++++++++++++++++++++++++++++++++++++++++++
			/*/
			this.gstack.push(this.gstate);
			this.gstate=this.gstate.clone();
			//*/
		},
		grestore:function(){
			this.gstate=this.gstack.pop();
		},
		grestoreall:function(){
			if(this.gstack.length==0)return;
			this.gstate=this.gstack[0];
			this.gstack.length=0;
		},
		applygstate:function(gstate){
			agh.memcpy(gstate,this.gstate);
			gstate.path=agh.Array.clone(this.gstate.path);
			gstate.clipstack=agh.Array.clone(this.gstate.clipstack);
			gstate.CTM=agh.Array.clone(this.gstate.CTM);
		},
		setgstate:function(gstate){
			this.gstate=gstate;
		},
		//------------------------------------------------------
		// 描画設定
		setlinewidth:function(value){
			this.gstate.linewidth=parseFloat(value);
		},
		getlinewidth:function(){
			return this.gstate.linewidth;
		},
		setlinecap:function(value){
			this.gstate.linecap=parseInt(value);
		},
		getlinecap:function(){
			return this.gstate.linecap;
		},
		setlinejoin:function(value){
			this.gstate.linejoin=parseInt(value);
		},
		getlinejoin:function(){
			return this.gstate.linejoin;
		},
		setmiterlimit:function(value){
			this.gstate.miterlimit=parseFloat(value);
		},
		getmiterlimit:function(){
			return this.gstate.miterlimit;
		},
		setstrokeadjust:function(value){
			this.gstate.strokeadjust=!!value;
		},
		getstrokeadjust:function(){
			return this.gstate.strokeadjust;
		},
		setrgbcolor:function(r,g,b){
			this.gstate.color=new ns.color(r,g,b);
			this.gstate.colorspace=ns.color.DeviceRGB;
		},
		getrgbcolor:function(){
			var c=this.gstate.color;
			return [c.r,c.g,c.b];
		},
		sethsbcolor:function(h,s,b){
			this.gstate.color=new ns.color.fromHSV(h,s,b);
			this.gstate.colorspace=ns.color.DeviceRGB;
		},
		gethsbcolor:function(){
			return this.gstate.color.toHSV();
		},
		setcmykcolor:function(c,m,y,k){
			this.gstate.color=new ns.color.fromCMYK(c,m,y,k);
			this.gstate.colorspace=ns.color.DeviceCMYK;
		},
		getcmykcolor:function(){
			return this.gstate.color.toCMYK();
		},
		setgray:function(gr){
			this.gstate.color=ns.color.fromGray(gr);
			this.gstate.colorspace=ns.color.DeviceGray;
		},
		getgray:function(){
			return this.gstate.color.toGray();
		},
		setcolorspace:function(value){
			this.gstate.colorspace=value;
		},
		getcolorspace:function(){
			return this.gstate.colorspace;
		},
		//------------------------------------------------------
		transf_point:function(p){
			var p_=ns.AffineA.transformD(p,this.gstate.CTM);
			return p_;
		},
		rtransf_point:function(b,p){
			var p_=ns.AffineA.dtransformD(p,this.gstate.CTM);
			p_[0]+=b[0];p_[1]+=b[1];
			return p_;
		},
		// パス構築
		newpath:function(){
			this.gstate.path.length=0;
		},
		moveto:function(x,y){
			this.gstate.position=this.transf_point([x,y]);
		},
		rmoveto:function(x,y){
			this.gstate.position=this.rtransf_point(this.gstate.position,[x,y]);
		},
		lineto:function(x,y){
			var s=this.gstate;
			var p1=s.position;
			var p2=this.transf_point([x,y]);
			s.path.push([PATH_LINE,p1,p2]);
			s.position=p2;
		},
		rlineto:function(x,y){
			var s=this.gstate;
			var p1=s.position;
			var p2=this.rtransf_point(s.position,[x,y]);
			s.path.push([PATH_LINE,p1,p2]);
			s.position=p2;
		},
		curveto:function(c1x,c1y,c2x,c2y,x,y){
			var s=this.gstate;
			var p1=s.position;
			var c1=this.transf_point([c1x,c1y]);
			var c2=this.transf_point([c2x,c2y]);
			var p2=this.transf_point([x,y]);
			s.path.push([PATH_CBEZ,p1,c1,c2,p2]);
			s.position=p2;
		},
		rcurveto:function(c1x,c1y,c2x,c2y,x,y){
			var s=this.gstate;
			var p1=s.position;
			var c1=this.rtransf_point(s.position,[c1x,c1y]);
			var c2=this.rtransf_point(s.position,[c2x,c2y]);
			var p2=this.rtransf_point(s.position,[x,y]);
			s.path.push([PATH_CBEZ,p1,c1,c2,p2]);
			s.position=p2;
		},
		closepath:function(){
			this.gstate.path.push([PATH_CLOSE]);
		},
		_:0
	});
	//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
#%include "agh.lang.ps-vml.js"
#%include "agh.lang.ps-svg.js"
#%include "agh.lang.ps-canvas.js"
#%include "agh.lang.ps-geo.js"
	//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	// 描画設定
	agh.memcpy(ns.systemdict.data,{
		initgraphics:function initgraphics(proc){
			proc.graphics.ginit();
		},
		gsave:function gsave(proc){
			proc.graphics.gsave();
		},
		grestore:function grestore(proc){
			proc.graphics.grestore();
		},
		grestoreall:function grestoreall(proc){
			proc.graphics.grestoreall();
		},
		currentgstate:function currentgstate(proc){
			var value=proc.stk[proc.stk.length-1];
			if(value instanceof ns.PsGState)
				proc.graphics.applygstate(value);
			else
				proc.onerror("typecheck","gstate object is required.");
		},
		setgstate:function setgstate(proc){
			var value=proc.stk.pop();
			if(value instanceof ns.PsGState)
				proc.graphics.setgstate();
			else
				proc.onerror("typecheck","gstate object is required.");
		},
		save:function save(proc){
			// ■ VM (ns.PsArray の中身など) の保存・復元は難しい
			//    現状では、PsArray の中身などに関しては復元しない実装になっている。
			// ※ save のもう一つの目的である、確保した領域を解放するという事については、
			//    javascript には GarbageCollector が居るので、特別な配慮は要らない。
			
			proc.stk.push(new ns.PsSave(proc));
		},
		restore:function restore(proc){
			var snap=proc.stk.pop();
			if(!(snap instanceof ns.PsSave)){
				proc.onerror("typecheck","a savetype operand is required.");
				return;
			}
			
			snap.restore(proc);
		},
		//------------------------------------------------------
		// clippath
		clip:function clip(proc){
			// ■ TODO : NOT IMPLEMENTED
			//    clippath &= path (intersection を取るべき)
			var g=proc.graphics;
			g.gstate.clippath=agh.Array.clone(g.gstate.path);
		},
		clippath:function clippath(proc){
			var g=proc.graphics;
			if(g.gstate.clippath==null){
				g.newpath();
				g.moveto(g.m_bbl,g.m_bbb);
				g.rlineto(g.m_bbw,0);
				g.rlineto(0,g.m_bbh)
				g.rlineto(-g.m_bbw,0);
				g.closepath();
			}else
				g.gstate.path=agh.Array.clone(g.gstate.clippath);
		},
		clipsave:function clipsave(proc){
			var g=proc.graphics;
			g.gstate.clipstack.push(g.gstate.clippath);
		},
		cliprestore:function cliprestore(proc){
			var g=proc.graphics;
			g.gstate.clippath=g.gstate.clipstack.pop();
		},
		// ■ TODO: clipping path を考慮した描画
		// ■ eoclip rectclip
		initclip:function initclip(proc){
			// default clip of the device
			proc.graphics.gstate.clippath=null;
		},
		//------------------------------------------------------
		// 間接
		setlinewidth:function setlinewidth(proc){
			var value=proc.stk.pop();
			proc.graphics.setlinewidth(value);
		},
		currentlinewidth:function currentlinewidth(proc){
			proc.stk.push(proc.graphics.getlinewidth());
		},
		setlinejoin:function setlinejoin(proc){
			var value=proc.stk.pop();
			proc.graphics.setlinejoin(value);
		},
		currentlinejoin:function currentlinejoin(proc){
			proc.stk.push(proc.graphics.getlinejoin());
		},
		setlinecap:function setlinecap(proc){
			var value=proc.stk.pop();
			proc.graphics.setlinecap(value);
		},
		currentlinecap:function currentlinecap(proc){
			proc.stk.push(proc.graphics.getlinecap());
		},
		setmiterlimit:function setmiterlimit(proc){
			var value=proc.stk.pop();
			proc.graphics.setmiterlimit(value);
		},
		currentmiterlimit:function currentmiterlimit(proc){
			proc.stk.push(proc.graphics.getmiterlimit());
		},
		setstrokeadjust:function setstrokeadjust(proc){
			proc.errstream("nosupport: setstrokeadjust");
			var value=proc.stk.pop();
			proc.graphics.setstrokeadjust(value);
		},
		currentstrokeadjust:function currentstrokeadjust(proc){
			proc.stk.push(proc.graphics.getstrokeadjust());
		},
		setrgbcolor:function setrgbcolor(proc){
			var b=proc.stk.pop();
			var g=proc.stk.pop();
			var r=proc.stk.pop();
			proc.graphics.setrgbcolor(r,g,b);
		},
		currentrgbcolor:function currentrgbcolor(proc){
			proc.stk.push.apply(proc.stk,proc.graphics.getrgbcolor());
		},
		setgray:function setgray(proc){
			var gr=proc.stk.pop();
			proc.graphics.setgray(gr);
		},
		currentgray:function currentgray(proc){
			proc.stk.push(proc.graphics.getgray());
		},
		sethsbcolor:function sethsbcolor(proc){
			var b=proc.stk.pop();
			var s=proc.stk.pop();
			var h=proc.stk.pop();
			proc.graphics.sethsbcolor(h,s,b);
		},
		currenthsbcolor:function currenthsbcolor(proc){
			proc.stk.push.apply(proc.stk,proc.graphics.gethsbcolor());
		},
		setcmykcolor:function setcmykcolor(proc){
			var k=proc.stk.pop();
			var y=proc.stk.pop();
			var m=proc.stk.pop();
			var c=proc.stk.pop();
			proc.graphics.setcmykcolor(c,m,y,k);
		},
		currentcmykcolor:function currentcmykcolor(proc){
			proc.stk.push.apply(proc.stk,proc.graphics.getcmykcolor());
		},
		setcolorspace:function setcolorspace(proc){
			var value=proc.stk.pop();
			proc.graphics.setcolorspace(value);
		},
		currentcolorspace:function currentcolorspace(proc){
			proc.stk.push(proc.graphics.getcolorspace());
		},
		// ■ TODO: setcolor currentcolor
		//--------------------------------------------------------------------------
	//# <PsGState 依存>
		setdash:function setdash(proc){
			var ofs=proc.stk.pop();
			var arr=proc.stk.pop();
			if(!(arr instanceof ns.PsArray)){
				proc.onerror("typecheck","operand 1/2 should be an array");
				return;
			}
			
			var darr=new Array(arr.length);
			for(var i=0;i<arr.length;i++)
				darr[i]=parseFloat(arr.data[arr.offset+i]);
			darr.dashoffset=parseFloat(ofs);
			proc.graphics.gstate.linedash=darr;
		},
		currentdash:function currentdash(proc){
			var linedash=proc.graphics.gstate.linedash;
			proc.stk.push(new ns.PsArray(agh.Array.clone(linedash)));
			proc.stk.push(linedash.offset);
		},
		setflat:function setflat(proc){
			proc.errstream("nosupport: setflat");
			var v=parseFloat(proc.stk.pop());
			if(isNaN(v))return;
			proc.graphics.gstate.flatness=v;
		},
		currentflat:function currentflat(proc){
			proc.stk.push(proc.graphics.gstate.flatness);
		},
		setoverprint:function setoverprint(proc){
			proc.errstream("nosupport: setoverprint");
			var v=!!proc.stk.pop();
			proc.graphics.gstate.overprint=v;
		},
		currentoverprint:function currentoverprint(proc){
			proc.stk.push(proc.graphics.gstate.overprint);
		},
		setsmoothness:function setsmoothness(proc){
			proc.errstream("nosupport: setsmoothness");
			var v=parseFloat(proc.stk.pop());
			if(isNaN(v))return;
			proc.graphics.gstate.smoothness=v;
		},
		currentsmoothness:function currentsmoothness(proc){
			proc.stk.push(proc.graphics.gstate.smoothness);
		}
	//# </PsGState 依存>
	});
	//----------------------------------------------------------------------------
	// 描画
#%define agh::operator (
	ns.systemdict.register_operator('newpath',function newpath(proc){
		proc.graphics.newpath();
	},function(opt){
		opt.stk.push([OP_CODE,'proc.graphics.newpath();\n']);
	});
#%)
#%expand agh::operator
#%expand agh::operator.r|newpath|closepath|
#%expand agh::operator.r|newpath|fill|
#%expand agh::operator.r|newpath|stroke|
#%expand agh::operator.r|newpath|showpage|
#%define agh::operator (
	ns.systemdict.register_operator('lineto',function lineto(proc){
		var y=proc.stk.pop();
		var x=proc.stk.pop();
		proc.graphics.lineto(x,y);
	},function(opt){
		var y=opt.stkpop();
		var x=opt.stkpop();
		opt.stk.push([OP_CODE,'proc.graphics.lineto('+opt.operation2code(x)+','+opt.operation2code(y)+');\n']);
	});
#%)
#%expand agh::operator
#%expand agh::operator.r|lineto|rlineto|
#%expand agh::operator.r|lineto|moveto|
#%expand agh::operator.r|lineto|rmoveto|
#%define agh::operator (
	ns.systemdict.register_operator('curveto',function curveto(proc){
		var y=proc.stk.pop();
		var x=proc.stk.pop();
		var c2y=proc.stk.pop();
		var c2x=proc.stk.pop();
		var c1y=proc.stk.pop();
		var c1x=proc.stk.pop();
		proc.graphics.curveto(c1x,c1y,c2x,c2y,x,y);
	},function(opt){
		var y=opt.stkpop();
		var x=opt.stkpop();
		var c2y=opt.stkpop();
		var c2x=opt.stkpop();
		var c1y=opt.stkpop();
		var c1x=opt.stkpop();
		var args=[
			opt.operation2code(c1x),
			opt.operation2code(c1y),
			opt.operation2code(c2x),
			opt.operation2code(c2y),
			opt.operation2code(x),
			opt.operation2code(y)
		];
		opt.stk.push([OP_CODE,'proc.graphics.curveto('+args.join(',')+');\n']);
	});
#%)
#%expand agh::operator
#%expand agh::operator.r|curveto|rcurveto|
	agh.memcpy(ns.systemdict.data,{
	//# <PsGState 依存>
		charpath:function charpath(proc){
			var type=proc.stk.pop(); // fill or stroke (not used)
			var text=proc.stk.pop();
			var s=proc.graphics.gstate;
			var font=s.font;
			
			if(!agh.is(type,Boolean)){
				proc.onerror('typecheck',"operand2/2: a boolean value is expected.");
				return;
			}else if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			
			text=font.Decode(text);
			var smove=font.GetStringMove(text);
			
			s.path.push([PATH_CHAR,s.position,agh.Array.clone(s.CTM),font,text,smove]);
			
			var m_=ns.AffineA.dtransform(smove,font.matrix);
			s.position=proc.graphics.rtransf_point(s.position,m_);
		},
		pathbbox:function pathbbox(proc){
      // PostScript Language Reference によると:
      // 1 device space で矩形を計算する
      // 2 user space に矩形を変換する (inverse CTM)
      // 3 2でできた四角形を含む矩形を計算する
      //
      // 基本 moveto は考慮に入れないが、
      // moveto しか path に含まれていない場合はそれを使う。
      // この実装では gstate.position に残っている物を使う。
			var fNULL=true;var m,M;
      var gstate=proc.graphics.gstate;
#%[pathbbox_user_space=0]
			function addp(p){
#%if pathbbox_user_space (
				p=ns.AffineA.itransform(p,gstate.CTM);
				if(fNULL){
					m=p;
          M=[p[0],p[1]];
					fNULL=false;
				}else{
					if(p[0]<m[0])m[0]=p[0];else if(p[0]>M[0])M[0]=p[0];
					if(p[1]<m[1])m[1]=p[1];else if(p[1]>M[1])M[1]=p[1];
				}
#%else
				if(fNULL){
					m=[p[0],p[1]];
          M=[p[0],p[1]];
					fNULL=false;
				}else{
					if(p[0]<m[0])m[0]=p[0];else if(p[0]>M[0])M[0]=p[0];
					if(p[1]<m[1])m[1]=p[1];else if(p[1]>M[1])M[1]=p[1];
				}
#%)
			}
			
			var path=gstate.path;
			var pos=null;
			for(var i=0;i<path.length;i++){
				var e=path[i];
				switch(e[0]){
					case PATH_LINE:
						if(pos!=e[1])addp(e[1]);
						addp(pos=e[2]);
						break;
					case PATH_CBEZ:
						if(!e.__flatten__){
							if(pos!=e[1])addp(e[1]);
							addp(e[2]);
							addp(e[3]);
							addp(pos=e[4]);
						}else{
							// ■TODO
							if(pos!=e[1])addp(e[1]);
							addp(pos=e[4]);
							proc.onerror('notimplemented',"pathbbox for flatten cbez");
						}
						break;
					case PATH_CHAR:
						var pos=e[1];
						var ctm=e[2];
						var font=e[3];
						
						var matrix=ns.AffineA.mul(font.matrix,ctm);
						var sz=font.GetStringRawSize(e[4]);
						var dx=ns.AffineA.dtransformD([sz[0],0],matrix);
						var dy=ns.AffineA.dtransformD([0,sz[1]],matrix);
						
						var vtx=font.matrix.slice(4,6);
						ns.AffineA.dtransformD(vtx,ctm);
						vtx[0]+=pos[0];vtx[1]+=pos[1];
						
						vtx[0]+=dy[0]*0.1;vtx[1]+=dy[1]*0.1;   // 余白補正
						addp(vtx);
						vtx[0]+=dx[0];vtx[1]+=dx[1];
						addp(vtx);
						vtx[0]+=dy[0]*0.65;vtx[1]+=dy[1]*0.65; // 余白補正
						addp(vtx);
						vtx[0]-=dx[0];vtx[1]-=dx[1];
						addp(vtx);

						pos=null;
						break;
				}
			}
			
			if(fNULL){
        if(gstate.position){
          var p=ns.AffineA.itransform(gstate.position,gstate.CTM);
				  proc.stk.push(p[0],p[1],p[0],p[1]);
        }else{
          proc.onerror('nocurrentpoint');
        }
			}else{
#%if !pathbbox_user_space
				// var ctm=gstate.CTM;
				// ns.AffineA.itransformD(m,ctm);
				// ns.AffineA.itransformD(M,ctm);

        var dx=M[0]-m[0];
        var dy=M[1]-m[1];

				var ictm=ns.AffineA.inv(gstate.CTM);
				ns.AffineA.transformD(m,ictm);
        M[0]=m[0];M[1]=m[1];
        
        // m += [min(dd0),min(dd1)], M += [max(dd0),max(dd1)]
        //   where dd = (dx? dy?) ictm = (dx?*ictm0 + dy?*ictm2, dx?*ictm1 + dy?*ictm3)
        //         dx? = 0 or dx
        //         dy? = 0 or dy
        var a;
        if((a=dx*ictm[0])>=0)M[0]+=a;else m[0]+=a;
        if((a=dx*ictm[1])>=0)M[1]+=a;else m[1]+=a;
        if((a=dy*ictm[2])>=0)M[0]+=a;else m[0]+=a;
        if((a=dy*ictm[3])>=0)M[1]+=a;else m[1]+=a;
#%end
				proc.stk.push(m[0],m[1],M[0],M[1]);
			}
		},
		rectfill:function rectfill(proc){
			var a=proc.stk.pop();
			if(a instanceof ns.PsArray){
				var x=a.data[a.offset];
				var y=a.data[a.offset+1];
				var w=a.data[a.offset+2];
				var h=a.data[a.offset+3];
			}else if(a instanceof ns.PsString){
				// ■ EncodedeNumberString の場合
				proc.onerror('notimplemented',"EncodedNumberString");
				return;
			}else{
				var h=a;
				var w=proc.stk.pop();
				var y=proc.stk.pop();
				var x=proc.stk.pop();
			}
			
			var g=proc.graphics;
			var p0=g.gstate.position;
			var p1=g.rtransf_point(p0,[x,y]);
			var p2=g.rtransf_point(p0,[x+w,y]);
			var p3=g.rtransf_point(p0,[x+w,y+h]);
			var p4=g.rtransf_point(p0,[x,y+h]);
			
			var oPath=g.gstate.path;
			g.gstate.path=[
				[PATH_LINE,p1,p2],
				[PATH_LINE,p2,p3],
				[PATH_LINE,p3,p4],
				[PATH_CLOSE]
			];
			g.fill();
			g.gstate.path=oPath;
			// ■
		},
		rectstroke:function rectstroke(proc){
			var g=proc.graphics;
			
			// 引数 m=matrix
			var m=proc.stk.pop();
			if(a instanceof ns.PsArray&&a.length==6){
				var a=proc.stk.pop();
				m=ns.AffineA.mulA(m,g.gstate.CTM);
			}else{
				var a=m;
				m=g.gstate.CTM;
			}
			
			// 引数 矩形
			if(a instanceof ns.PsArray){
				var x=a.data[a.offset];
				var y=a.data[a.offset+1];
				var w=a.data[a.offset+2];
				var h=a.data[a.offset+3];
			}else if(a instanceof ns.PsString){
				// ■ EncodedeNumberString の場合
				proc.onerror('notimplemented',"EncodedNumberString");
				return;
			}else{
				var h=a;
				var w=proc.stk.pop();
				var y=proc.stk.pop();
				var x=proc.stk.pop();
			}
			
			//window.log("dbg: x={0} y={1} w={2} h={3}".format(x,y,w,h));
			//window.log("dbg: m="+m);
			var p1=ns.AffineA.transformD([x,y],m);
			var p2=ns.AffineA.transformD([x+w,y],m);
			var p3=ns.AffineA.transformD([x+w,y+h],m);
			var p4=ns.AffineA.transformD([x,y+h],m);
			
			var oPath=g.gstate.path;
			g.gstate.path=[
				[PATH_LINE,p1,p2],
				[PATH_LINE,p2,p3],
				[PATH_LINE,p3,p4],
				[PATH_CLOSE]
			];
			g.stroke();
			g.gstate.path=oPath;
		}
	//# </PsGState 依存>
	});
	//++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
	// 文字列表示
  // ToDo: CIDFont & CMap
	ns.FontMapping={
		Courier:"Courier",
		Helvetica:"Arial",
		Times:"'Times New Roman'",
		'Times-Roman':"'Times New Roman'",
		'Ryumin-Light-H':"'Ryumin-Light-H','Yu Mincho','MS Mincho'",
		'GothicBBB-Medium-H':"'Gothic-Medium-H','Yu Gothic','MeiryoKe_PGothic','Meiryo','MS PGothic'"
	};
	var PS_FONT_SCALE=50;
	ns.PsFont=agh.Class(nsName+'.PsFont',null,{
		bold:false,
		style:'normal',
		filter:null,
		size:PS_FONT_SCALE,
		fontname:"",
		matrix:null,
		constructor:function(arg1,arg2){
			this.base();
			if(agh.is(arg1,String)){
				this.init_fontname(arg1);
				
				var size=arg2||1;
				this.matrix=[size/PS_FONT_SCALE,0,0,size/PS_FONT_SCALE,0,0];
			}else if(arg1 instanceof ns.PsFont){
				var font=arg1;
				
				this.bold=font.bold;
				this.style=font.style;
				this.fontname=font.fontname;
				
				// 線形合成
				if(arg2 instanceof Array){
					ns.AffineA.mulD(font.matrix,this.matrix=arg2);
				}else{
					this.matrix=agh.Array.clone(font.matrix);
					for(var i=0;i<6;i++)
						this.matrix[i]*=arg2;
				}
			}
		},
		init_fontname:function(fontname){
			if(/\-Bold$/.test(fontname)){
				this.bold=true;
				fontname=fontname.slice(0,-5);
			}else if(/\-Oblique$/.test(fontname)){
				this.style='oblique';
				fontname=fontname.slice(0,-8);
			}else if(/\-Italic$/.test(fontname)){
				this.style='italic';
				fontname=fontname.slice(0,-7);
			}else if(/\-BoldOblique$/.test(fontname)){
				this.bold=true;
				this.style='oblique';
				fontname=fontname.slice(0,-12);
			}else if(/\-BoldItalic$/.test(fontname)){
				this.bold=true;
				this.style='italic';
				fontname=fontname.slice(0,-11);
			}
			
			// ■ Encoding
			
			if(fontname in ns.FontMapping)
				fontname=ns.FontMapping[fontname];
			this.fontname=fontname;
		},
		GetStringRawSize:(function(){
			var span=document.createElement('span');
			agh.memcpy(span.style,{
				position:'absolute',left:'0px',top:'0px',
				overflow:'hidden',visibility:'hidden',
				fontSize:'100px'
			});
			
			// document.body 待ち
			var init=false;
			agh.scripts.wait(["event:onload"],function(){
				document.body.appendChild(span);
				init=true;
			});
			
			return function(text){
				if(!init){
					var w=0;
					for(var i=0;i<text.length;i++)
						if(text.charCodeAt(i)>0xFF)w++;
					return [this.size*(text.length+w)*0.5,this.size];
				}
				
				span.style.fontFamily=this.fontname;
				span.style.fontWidth=this.bold?'bold':'normal';
				span.style.fontStyle=this.oblique?'oblique':'normal';
				
				if(agh.browser.vFx){
					span.textContent='xx';
					var w_xx=span.offsetWidth;
					span.textContent='x'+text+'x';
					var w_text=span.offsetWidth;
					var h_text=span.offsetHeight;
					span.textContent='';
				}else{
					span.innerText='xx';
					var w_xx=span.offsetWidth;
					span.innerText='x'+text+'x';
					var w_text=span.offsetWidth;
					var h_text=span.offsetHeight;
					span.innerText='';
				}
				return [this.size*(w_text-w_xx)/100,this.size*h_text/100];
			};
		})(),
		GetStringMove:function(text){
			var ret=this.GetStringRawSize(text);
			ret[1]=0; // 横書き
			return ret;
		},
		Decode:function(text){
			if(this.filter!=null&&text instanceof ns.PsString){
				return this.fitler(text);
			}else{
				return ""+text;
			}
		},
    fillText:function(graphics,text,move,pos){
      graphics.fill_text(text,move,pos,this);
    },
		_:0
	});
	ns.PsNullFont=agh.Class(nsName+'.PsNullFont',ns.PsFont,{
		fontname:'none',
		Decode:function override(text){return "";},
		GetStringRawSize:function override(text){return [0,0];}
	});
	ns.PsNullFont.instance=new ns.PsNullFont();
	//----------------------------------------------------------------------------
  // Type 1 対応試験 2014-12-13
  ns.PsType1Font=agh.Class(nsName+'.PsType1Font',ns.PsFont,{
    constructor:function(dict){
      this.base('Times',1);
      this.m_dict=dict;
      this.m_priv=dict.data.Private;
      this.m_table=dict.data.Encoding.data;
      this.m_glyph=dict.data.CharStrings.data;
      
      window.log(this.m_dict.toPs2());
    },
    // Decode:function override(text){
    //   window.log("Type1Font#Decode(text): text=("+text+")");
    //   return this.callbase(text);
    // },
    fillText:function override(graphics,text,move,pos){
      window.log("Type1Font#fillText(text): text=("+text+")");
      for(var i=0;i<text.length;i++){
        var name=this.m_table[text.charCodeAt(i)];
        if(!name||!(name instanceof ns.PsName)||name.name==".notdef"){
          // 字送りだけでもする?
          continue;
        }

        var glyph=this.m_glyph[name.name];
      }
      return this.callbase(graphics,text,move,pos);
    }
    //■Decode
    //■GetStringRawSize
    //■GetStringMove
  });
  ns.PsType1Font.createFont=(function(){
    function checkFontDictionaryEntry(proc,fdict,key,type){
      if(!(fdict instanceof ns.PsDict)||!(key in fdict.data)){
        proc.onerror('invalidfont',"definefont(Type 1): missing entry '"+key+"' in the font dictionary.");
        return false;
      }
      if(type&&!(fdict.data[key] instanceof type)){
        proc.onerror('invalidfont',"definefont(Type 1): the entry '"+key+"' has an invalid type.");
        return false;
      }

      return true;
    }

    return function(proc,fdict){
      // check (本来は内部でチェックするべきなのでは?)
      if(!checkFontDictionaryEntry(proc,fdict,'Encoding',ns.PsArray))return;
      if(!checkFontDictionaryEntry(proc,fdict,'FontBBox'))return;
      if(!checkFontDictionaryEntry(proc,fdict,'PaintType'))return;
      if(!checkFontDictionaryEntry(proc,fdict,'CharStrings',ns.PsDict))return;
      if(!checkFontDictionaryEntry(proc,fdict,'Private',ns.PsDict))return;

      var font=new ns.PsType1Font(fdict);
      return font;
    };
  })();
	//----------------------------------------------------------------------------
	agh.memcpy(ns.systemdict.data,{
		findfont:function findfont(proc){
			var name=proc.stk.pop();
			if(name instanceof ns.PsName||name instanceof ns.PsString){
        name=""+name;
        if(name in proc.m_fontDirectory)
          proc.stk.push(proc.m_fontDirectory[name]);
        else
				  proc.stk.push(new ns.PsFont(""+name));
			}else
				proc.onerror("typecheck","operand1/1: a fontname is expected");
		},
		setfont:function setfont(proc){
			var font=proc.stk.pop();
			if(!(font instanceof ns.PsFont)){
				proc.onerror("typecheck","operand1/1: a font is expectedmust");
				return;
			}
			
			proc.graphics.gstate.font=font;
		},
		currentfont:function currentfont(proc){
			proc.stk.push(proc.graphics.gstate.font);
		},
		rootfont:function rootfont(proc){
			proc.stk.push(proc.graphics.gstate.font);
			// ■TODO: 正確には現在のフォントのルートフォント (大抵は自身)
		},
		scalefont:function scalefont(proc){
      var _scal;
			var scal=parseFloat(_scal=proc.stk.pop());
			var font=proc.stk.pop();
			
			if(isNaN(scal)){
				proc.onerror("typecheck","operand2/2: a number is expected. "+to_ps(_scal));
				return;
			}else if(!(font instanceof ns.PsFont)){
				proc.onerror("typecheck","operand1/2: a font is expected");
				return;
			}

			font=agh.wrap(font);
			font.matrix=agh.Array.clone(font.matrix);
			for(var i=0;i<6;i++)font.matrix[i]*=scal;
			proc.stk.push(font);
		},
		makefont:function makefont(proc){
			var mat=proc.stk.pop();
			var font=proc.stk.pop();
			
			if(!(mat instanceof ns.PsArray)){
				proc.onerror("typecheck","operand2/2: an array is expected");
				return;
			}else if(!(font instanceof ns.PsFont)){
				proc.onerror("typecheck","operand1/2: a font is expected");
				return;
			}
			
			if(mat.offset!=0){
				mat=mat.data.slice(mat.offset,mat.offset+6);
			}else{
				mat=agh.Array.clone(mat.data);
			}

      font=agh.wrap(font);
      font.matrix=ns.AffineA.mulD(font.matrix,mat);
			proc.stk.push(font);
		},
		selectfont:function selectfont(proc){
			var scal=parseFloat(proc.stk.pop());
			var name=proc.stk.pop();
			if(isNaN(scal)){
				proc.onerror("typecheck","operand2/2: a number is required");
				return;
			}else if(!(name instanceof ns.PsName||name instanceof ns.PsString)){
				proc.onerror("typecheck","operand1/2: a fontname-key is required");
				return;
			}
			
			proc.graphics.gstate.font=new ns.PsFont(""+name,scal);
		},
    definefont:function definefont(proc){
			if(proc.stk.length<2){
				proc.onerror('stackunderflow');
				return;
			}
      var fdict=proc.stk.pop();
      var key=proc.stk.pop();

      //■未実装
      var checkEntryFontName="font";
      function checkEntry(key){
        if(key in fdict.data)return true;
        proc.onerror("invalidfont",checkEntryFontName+": "+key+" entry is missing.");
        return false;
      }

      // check FontType, FontMatrix
      if(!(fdict instanceof ns.PsDict&&'FontType' in fdict.data&&'FontMatrix' in fdict.data)){
        if(!(fdict instanceof ns.PsDict))
          proc.onerror("invalidfont","the specified font is not a dictionary.");
        else{
          checkEntry('FontType');
          checkEntry('FontMatrix');
        }
        return;
      }

      var ftype=fdict.data.FontType;
      checkEntryFontName="font(FontType="+ftype+")";

      if(ftype==1){
        var font=ns.PsType1Font.createFont(proc,fdict);
        if(font)
          proc.m_fontDirectory[""+key]=font;
        return;
      }

      // 以下デバグ用
      function p(msg){proc.outstream("impl(definefont): "+msg);}
      p(to_ps(name)+" "+fdict.toPs2());
      p("FontType="+ftype);
      p("FontMatrix="+to_ps(fdict.data.FontMatrix));
      // FontName
      // FontInfo
      // LanguageLevel
      // WMode
      // FID (inserted by definefont, should not be defined previously)

      if('CIDFontType' in fdict.data)
        p("this is a cidfont: CIDFontType="+fdict.data.CIDFontType);
      else
        p("this is not a cidfont.");

      if(ftype==1||ftype==2||ftype==3||ftype==14||ftype==42){
        // base font
        if(!checkEntry('Encoding'))return;
        if(!checkEntry('FontBBox'))return;

        p("Encoding: "+to_ps(fdict.data.Encoding));
        p("FontBBox: "+to_ps(fdict.data.FontBBox));
        // UniqueID
        // XUID

        if(ftype==1){
          if(!checkEntry('PaintType'))return;
          if(!checkEntry('CharStrings'))return;
          if(!checkEntry('Private'))return;
          //■Adobe Type 1 Font Format に対応する必要がある
        }
      }

    },
		// ■TODO: definefont undefinefont composefont
		//   FontDirectory GlobalFontDirectory
		//   findencoding StandardEncoding ISOLatin1Encoding
		//   setcachedevice setcachedevice2 setcharwidth
		//--------------------------------------------------------------------------
		stringwidth:function stringwidth(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			
			var text=font.Decode(proc.stk.pop());
			proc.stk.push.apply(proc.stk,font.GetStringRawSize(text));
		},
		show:function show(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			var text=font.Decode(proc.stk.pop());
			
			var smove=font.GetStringMove(text);
      font.fillText(proc.graphics,text,smove);
			ns.AffineA.dtransformD(smove,font.matrix);
			proc.graphics.rmoveto(smove[0],smove[1]);
		},
		ashow:function ashow(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			var text=font.Decode(proc.stk.pop());
			var dy=parseFloat(proc.stk.pop());
			var dx=parseFloat(proc.stk.pop());
			
			var pos=[0,0];
			for(var i=0;i<text.length;i++){
				var c=text.charAt(i);
				var move=font.GetStringMove(c);
				font.fillText(proc.graphics,c,move,pos);
				
				ns.AffineA.dtransformD(move,font.matrix);
				pos[0]+=move[0]+dx;
				pos[1]+=move[1]+dy;
			}
			proc.graphics.rmoveto(pos[0],pos[1]);
		},
		widthshow:function widthshow(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			var text=font.Decode(proc.stk.pop());
			var ch=proc.stk.pop()|0;
			var dy=parseFloat(proc.stk.pop());
			var dx=parseFloat(proc.stk.pop());
			
			var pos=[0,0];
			for(var i=0;i<text.length;i++){
				var c=text.charAt(i);
				var move=font.GetStringMove(c);
				font.fillText(proc.graphics,c,move,pos);
				
				ns.AffineA.dtransformD(move,font.matrix);
				pos[0]+=move[0];
				pos[1]+=move[1];
				if(ch==text.charCodeAt(i)){
					pos[0]+=dx;
					pos[1]+=dy;
				}
			}
			proc.graphics.rmoveto(pos[0],pos[1]);
		},
		awidthshow:function awidthshow(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			var text=font.Decode(proc.stk.pop());
			var dy=parseFloat(proc.stk.pop());
			var dx=parseFloat(proc.stk.pop());
			var ch=proc.stk.pop()|0;
			var cy=parseFloat(proc.stk.pop());
			var cx=parseFloat(proc.stk.pop());
			
			var pos=[0,0];
			for(var i=0;i<text.length;i++){
				var c=text.charAt(i);
				var move=font.GetStringMove(c);
				font.fillText(proc.graphics,c,move,pos);
				
				ns.AffineA.dtransformD(move,font.matrix);
				pos[0]+=move[0]+dx;
				pos[1]+=move[1]+dy;
				if(ch==text.charCodeAt(i)){
					pos[0]+=cx;
					pos[1]+=cy;
				}
			}
			proc.graphics.rmoveto(pos[0],pos[1]);
		},
		kshow:function kshow(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			var text=font.Decode(proc.stk.pop());
			var exec=proc.stk.pop();
			
			for(var i=0;i<text.length;i++){
				if(i>0){
					proc.stk.push(text.charCodeAt(i-1));
					proc.stk.push(text.charCodeAt(i));
					proc.process(exec);
				}
				
				var c=text.charAt(i);
				var move=font.GetStringMove(c);
				font.fillText(proc.graphics,c,move);
				ns.AffineA.dtransformD(move,font.matrix);
				proc.graphics.rmoveto(move[0],move[1]);
			}
		},
		cshow:function cshow(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			var text=font.Decode(proc.stk.pop());
			var exec=proc.stk.pop();
			
			for(var i=0;i<text.length;i++){
				var c=text.charAt(i);
				var move=font.GetStringMove(c);
				ns.AffineA.dtransformD(move,font.matrix);
				
				proc.stk.push(text.charCodeAt(i),move[0],move[1]);
				proc.process(exec);
			}
			
			proc.graphics.gstate.font=font; // restore
		},
		xyshow:function xyshow(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			var arr=proc.stk.pop();
			var text=font.Decode(proc.stk.pop());
			
			// typecheck
			if(arr instanceof ns.PsArray){
				if(arr.length<2*text.length){
					proc.onerror("rangecheck","operand2/2: an array is too short");
					return;
				}
				arr=arr.data.slice(arr.offset,arr.offset+text.length*2);
			}else if(arr instanceof ns.PsString){
				//■TODO: Encoded Number String に対応
				proc.onerror("notimplemented","operand2/2: encoded number string");
				return;
			}else{
				proc.onerror("typecheck","operand2/2: an array or an encoded number string is expected.");
				return;
			}
			
			var pos=[0,0];
			for(var i=0;i<text.length;i++){
				var c=text.charAt(i);
				var move=font.GetStringMove(c);
				font.fillText(proc.graphics,c,move,pos);
				
				pos[0]+=arr[2*i];
				pos[1]+=arr[2*i+1];
			}
			proc.graphics.rmoveto(pos[0],pos[1]);
		},
		yshow:function yshow(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			var arr=proc.stk.pop();
			var text=font.Decode(proc.stk.pop());
			
			// typecheck
			if(arr instanceof ns.PsArray){
				if(arr.length<text.length){
					proc.onerror("rangecheck","operand2/2: an array is too short");
					return;
				}
				arr=arr.data.slice(arr.offset,arr.offset+text.length);
			}else if(arr instanceof ns.PsString){
				//■TODO: Encoded Number String に対応
				proc.onerror("notimplemented","operand2/2: encoded number string");
				return;
			}else{
				proc.onerror("typecheck","operand2/2: an array or an encoded number string is expected.");
				return;
			}
			
			var pos=[0,0];
			for(var i=0;i<text.length;i++){
				var c=text.charAt(i);
				var move=font.GetStringMove(c);
				font.fillText(proc.graphics,c,move,pos);
				
				pos[1]+=arr[i];
			}
			proc.graphics.rmoveto(pos[0],pos[1]);
		},
		xshow:function xshow(proc){
			var font=proc.graphics.gstate.font;
			if(font==null){
				proc.onerror("invalidfont","font is not set");
				return;
			}
			var arr=proc.stk.pop();
			var text=font.Decode(proc.stk.pop());
			
			// typecheck
			if(arr instanceof ns.PsArray){
				if(arr.length<text.length){
					proc.onerror("rangecheck","operand2/2: an array is too short");
					return;
				}
				arr=arr.data.slice(arr.offset,arr.offset+text.length);
			}else if(arr instanceof ns.PsString){
				//■TODO: Encoded Number String に対応
				proc.onerror("notimplemented","operand2/2: encoded number string");
				return;
			}else{
				proc.onerror("typecheck","operand2/2: an array or an encoded number string is expected.");
				return;
			}
			
			var pos=[0,0];
			for(var i=0;i<text.length;i++){
				var c=text.charAt(i);
				var move=font.GetStringMove(c);
				font.fillText(proc.graphics,c,move,pos);
				
				pos[0]+=arr[i];
			}
			proc.graphics.rmoveto(pos[0],pos[1]);
		}
	});
	//****************************************************************************
	//	Engine
	//----------------------------------------------------------------------------
	ns.ProcOption=function(){
	};
	agh.memcpy(ns.ProcOption.prototype,{
		MwgAllowAutoBind:false,
		MwgAllowInlining:false,
		SetMwgOptimization:function(flags){
			for(var i=0,iN=flags.length;i<iN;i++){
				switch(flags.charAt(i)){
					case 'b':this.MwgAllowAutoBind=true;break;
					case 'B':this.MwgAllowAutoBind=false;break;
					case 'i':this.MwgAllowInlining=true;break;
					case 'I':this.MwgAllowInlining=false;break;
				}
			}
		}
	});
	
	ns.Processor=function(info){
		this.stk_wgen=[];
		this.stk=[];
		this.scope=new ns.Scope();
		this.option=new ns.ProcOption();
		
		this.m_filestk=[];
		this.m_blklv=-1;
		this.m_blkstk=[];
		
		this.m_stop=false; // exit/stop/quit
		
		this.m_wstack=[]; // for debug trace
		
		this.InitGraphics('target' in info?info.target:'svg');
		if('bb' in info&&info.bb instanceof Array){
			this.graphics.SetBoundingBox.apply(this.graphics,info.bb);
		}
		if('size' in info&&info.size instanceof Array){
			this.graphics.SetDisplaySize(info.size[0],info.size[1]);
		}

    // 2014-12-13 font
    this.m_fontDirectory={};
	};
	agh.memcpy(ns.Processor.prototype,{
		wgen:null,
		stk_wgen:null,
		push_wgen:function(wgen){
			if(this.wgen!=null)
				this.stk_wgen.push(this.wgen);
			this.wgen=wgen;
		},
		pop_wgen:function(){
			if(this.stk_wgen.length>0)
				this.wgen=this.stk_wgen.pop();
			else
				this.wgen=null;
		},
		next_word:function(){
			while(this.wgen!=null){
				var w=this.wgen.next();
				if(w!=null)return w;
				this.pop_wgen();
			}
			return null;
		},
		outstream:function(){},
		errstream:function(text){
			this.outstream(text);
		},
		onerror:function(name,desc){
			this.m_stop='stop';
			var buff=['error'];
			for(var i=this.m_wstack.length-1;i>=0;i--){
				var w=this.m_wstack[i];
				if(w instanceof Object&&'iL' in w){
					buff.push('@(')
					buff.push(w.file)
					buff.push(':');
					buff.push(w.iL);
					buff.push('.');
					buff.push(w.iC);
					buff.push(')');
				}else if(agh.is(w,Function)){
					buff.push('@');
					buff.push(to_ps(w));
				}else{
					buff.push('@?'+w);
				}
			}
			
			buff.push(':');
			buff.push(name);
			if(desc!=null){
				buff.push(': ');
				buff.push(desc);
			}
			
			this.errstream(buff.join(''));
		},
		//--------------------------------------------
		InitGraphics:function(type){
			if(agh.is(type,String)){
				switch(type.toLowerCase()){
				case "vml":
					this.graphics=new agh.PostScript.GraphicsVml();
					return;
				case "svg":
					this.graphics=new agh.PostScript.GraphicsSvg();
					return;
				}
			}else if(type!=null&&'tagName' in type){
				// HTML 要素 -> canvas
				//alert('dbg: GraphicsCanvas');
				this.graphics=new agh.PostScript.GraphicsCanvas(type);
				return;
			}
			
			this.errstream("error:InitGraphics(): unrecognized output type '"+type+"'");
		},
		//--------------------------------------------
		reg_comment_bb:new RegExp(
			"^{0}\\%{0}BoundingBox{0}\\:{0}:N{1}:N{1}:N{1}:N"
				.replace(/\:N\b/g,"([-+]?[\\d.]+)")
				.replace(/\{0\}/g,"[ \\t]*")
				.replace(/\{1\}/g,"[ \\t]+")
		),
		reg_comment_MwgOptimization:new RegExp(
			"^{0}\\%{0}MwgOptimization{0}\\:{0}(\\S+)"
				.replace(/\{0\}/g,"[ \\t]*")
		),
		/*
		Run:function Run(text){
			this.push_wgen(new ns.ScannerF(text,this));
			//this.scope.push_dict(new ns.PsDict());
			this.m_block_lv=0;
			this.m_block=null;
			var w=null;
			while((w=this.next_word())!=null){
				//window.log(w);
				if(w instanceof ns.PsComment){
					var m=null;
					if(m=this.reg_comment_bb.exec(w.text)){
						this.graphics.SetBoundingBox(
							parseFloat(m[1]),parseFloat(m[2]),
							parseFloat(m[3]),parseFloat(m[4]));
					}
					continue;
				}
				this.process(w);
				if(this.m_stop){
					if(this.m_stop=='exit')this.onerror("invalidexit");
					this.m_stop=false;
					break;
				}
			}
			//this.scope.pop_dict(this);
		},
		//*/
		Run:function Run(text){
			//var scanner=new ns.Scanner(text,this);
			this.m_blklv=-1;
			this.m_blkstk=[];
			this.m_inittime=new Date().getTime();
			
			this.runfile(text);
			if(this.m_stop){
				if(this.m_stop=='exit')this.onerror("invalidexit");
				this.m_stop=false;
			}
				
			this.scope.userdict.clear();
			this.option=new ns.ProcOption();
			//window.log(agh.keys(this.scope.systemdict.userdict.data));
			//window.log(this.scope.systemdict.userdict.toPs2());
			//window.log(this.scope.globaldict.toPs2());
			//window.log(this.scope.systemdict.toPs2());
		},
		runfile:function runfile(file){
			var scanner=new ns.ScannerF(file,this);
			this.m_filestk.push(scanner.file);
			var w=null;
			while((w=scanner.next())!=null){
				if(w instanceof ns.PsComment){
					var m=null;
					if(m=this.reg_comment_bb.exec(w.text)){
						this.graphics.SetBoundingBox(
							parseFloat(m[1]),parseFloat(m[2]),
							parseFloat(m[3]),parseFloat(m[4]));
					}else if(m=this.reg_comment_MwgOptimization.exec(w.text)){
						this.option.SetMwgOptimization(m[1]);
					}
					continue;
				}
				this.process(w);
				if(this.m_stop)break;
			}
			this.m_filestk.pop();
		},
		process:function process(w){
			this.m_wstack.push(w);
			if(this.m_blklv<0){
				if(w.__xaccess__){
					if(w instanceof ns.PsName){
						var val=this.scope.get_val(this,w.name);
						if(val!=null)
							this.process(val,w);
					}else if(w instanceof ns.PsArray){
						// dbg
						//* // w.execute_function(this);
							if(w.__funcver__!=w.data.ver)
								w.compile_function(this);
							w.__function__(this,w.__funcargs__);
						/*/
							for(var i=0;i<w.length;i++){
								var w2=w.data[w.offset+i];
								if(w2.__xaccess__&&!(w2 instanceof ns.PsArray)||w2 instanceof Function){
									this.process(w2);
									if(this.m_stop)break;
								}else
									this.stk.push(w2);
							}
						//*/
					}else if(w instanceof ns.PsString){
						var cscan=new ns.ScannerF(w.toString(),this);
						var w2=null;
						while(w2=cscan.next()){
							if(w2 instanceof ns.PsComment)continue;
							this.process(w2);
							if(this.m_stop)break;
						}
					}else if(w==MARK_PROC_BEGIN){
						this.m_blklv=0;
						this.m_blkstk.push([]);
					}else if(w==MARK_PROC_END){
						this.onerror("syntaxerror","unexpected '}'. The corresponding '{' does not exist.");
					}else if(!(w instanceof ns.PsNull)){
						this.stk.push(w);
					}
				}else if(w instanceof Function){
					w(this);
				}else{
					this.stk.push(w);
				}
			}else{
				//---- { } で囲まれている部分は実行せずに、実行可能配列に格納
				if(w==MARK_PROC_BEGIN){
					this.m_blklv++;
					this.m_blkstk.push([]);
					
					this.m_wstack.pop();return;
				}else if(w==MARK_PROC_END){
					this.m_blklv--;
					var a=new ns.PsArray(this.m_blkstk.pop());
						a.__xaccess__=true;
						a.file=w.file;
						a.iL=w.iL;
						a.iC=w.iC;
						//■TODO: whether a procedure is defaultly packed? device 設定
					w=a;
					
					if(this.m_blklv<0){
						this.stk.push(w);
						
						this.m_wstack.pop();return;
					}
				}else if(w.__imediate__){
					var val=this.scope.get_val(this,w.name);
					if(val==null){
						this.onerror("undefined","'"+w.name+"'");
					}else{
						w=val;
					}
				}
				
				this.m_blkstk[this.m_blklv].push(w);
			}
			this.m_wstack.pop();
		},
		_:0
	});
	//============================================================================
	ns.systemdict.update_length();
	ns.Optimizer.initialize();
	/*
				
		■ Clippnig path の実装
			
	*/

});

