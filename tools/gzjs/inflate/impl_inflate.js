/* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
 * Version: 1.0.0.1
 * LastModified: Dec 25 1999
 */

/* Interface:
 * data=zip_inflate(src);
 */

///#gzjs-outfile(bin/mwgc.inflate.js)
//#gzjs-option(c-:gz)
//#gzjs-tokenmap(GET_BYTE,      BA)
//#gzjs-tokenmap(HufBuild,      AZ)
//#gzjs-tokenmap(HuftList,      AY)
//#gzjs-tokenmap(N_MAX,        AX)
//#gzjs-tokenmap(STORED_BLOCK,    AW)
//#gzjs-tokenmap(dbits,        AV)
//#gzjs-tokenmap(inflate,      AU)
//#gzjs-tokenmap(inflate_dynamic,  AT)
//#gzjs-tokenmap(inflate_fixed,    AS)
//#gzjs-tokenmap(inflate_internal,  AR)
//#gzjs-tokenmap(inflate_start,    AQ)
//#gzjs-tokenmap(inflate_stored,  AP)
//#gzjs-tokenmap(lbits,        AO)
//#gzjs-tokenmap(next,        AN)
//#gzjs-tokenmap(str,        AM)
//#gzjs-tokenmap(MASK_BITS,      AL)
//#gzjs-tokenmap(assign,      AK)
//#gzjs-tokenmap(fixed_td,      AJ)
//#gzjs-tokenmap(min,        AI)
//#gzjs-tokenmap(HuftNode,      AH)
//#gzjs-tokenmap(border,      AG)
//#gzjs-tokenmap(inflate_pos,    AF)
//#gzjs-tokenmap(out,        AE)
//#gzjs-tokenmap(cpdext,      AD)
//#gzjs-tokenmap(cpdist,      AC)
//#gzjs-tokenmap(cplens,      AB)
//#gzjs-tokenmap(cplext,      AA)
//#gzjs-tokenmap(fixed_bd,      $)
//#gzjs-tokenmap(fixed_bl,      _)
//#gzjs-tokenmap(fixed_tl,      Z)
//#gzjs-tokenmap(inflate_codes,    Y)
//#gzjs-tokenmap(inflate_data,    X)
//#gzjs-tokenmap(list,        W)
//#gzjs-tokenmap(HuftBuild,      V)
//#gzjs-tokenmap(bit_buf,      U)
//#gzjs-tokenmap(eof,        T)
//#gzjs-tokenmap(calloc,      S)
//#gzjs-tokenmap(tail,        R)
//#gzjs-tokenmap(GETBITS,      Q)
//#gzjs-tokenmap(bit_len,      P)
//#gzjs-tokenmap(copy_dist,      O)
//#gzjs-tokenmap(BMAX,        N)
//#gzjs-tokenmap(NEEDBITS,      M)
//#gzjs-tokenmap(DUMPBITS,      L)
//#gzjs-tokenmap(WSIZE_M,      K)
//#gzjs-tokenmap(root,        J)
//#gzjs-tokenmap(slide,        I)
//#gzjs-tokenmap(status,      H)
//#gzjs-tokenmap(method,      G)
//#gzjs-tokenmap(NGDBITS,      F)
//#gzjs-tokenmap(off,        E)
//#gzjs-tokenmap(pidx,        D)
//#gzjs-tokenmap(copy_leng,      C)
//#gzjs-tokenmap(buff,        B)
//#gzjs-tokenmap(size,        A)

//%m body
var inflate_a2a=(function(){
  var min=Math.min;
  //function min(a,b){return a<b?a:b;}
  //function calloc(n,v){var a=new Array(n);while(n--)a[n]=v;return a;}
  function calloc(n){var a=[];while(n--)a[n]=0;return a;}
  
  /* constant parameters */
  //var WSIZE=32768;  
  var WSIZE_M=32767;  // WSIZE-1 == 32768 -1 == 1<<15 // WSIZE: Sliding Window size
  var STORED_BLOCK=0;

  /* for inflate */
  var lbits=9;     // bits in base literal/length lookup table
  var dbits=6;     // bits in base distance lookup table

  /* variables (inflate) */
  var slide,wp,fixed_tl=null;
  var fixed_td,fixed_bl,fixed_bd;
  var bit_buf,bit_len,
  method,eof,
  copy_leng,copy_dist,
  tl,td,bl,bd,
  inflate_data,inflate_pos;

  var i,j;
  var MASK_BITS=[];i=1<<17;while(i>>=1)MASK_BITS.unshift(i-1);
  var cplext=[0,99,99];for(i=7;i;)cplext.unshift(j=--i-!!i,j,j,j);
  var cplens=[227,258,0,0];for(i=27;i--;)cplens.unshift(cplens[0]-(1<<cplext[i]));
  var cpdext=[0,0];for(i=0;i<14;)cpdext.push(i,i++);
  var cpdist=[1];for(i=0;i<29;)cpdist.push(cpdist[i]+(1<<cpdext[i++]));
  var border=[16,17,18,0,i=8];while(--i)border.push(i,16-i);

  function copyHuftNode(d,s){
    d.e=s.e;
    d.b=s.b;
    d.n=s.n;
    d.t=s.t;
  }

  // var BMAX=16;
  // var N_MAX=288;
  function HuftBuild(b,n,s,d,e,mm){
    this.status=this.m=0;
      
    var c=calloc(BMAX+1);
    var lx=calloc(BMAX+1);
    var r={}; // new HuftNode(); 
    var u=calloc(BMAX);
    var v=calloc(N_MAX+1);
    var x=calloc(BMAX+1);
    var tail=this.root=0; // as HuftList
    var a,el,f,g,h,i,j,k,pidx,q,w,xp,y,z,o;
    
    el=n>256?b[256]:BMAX;

    // b = 符号長の表
    // c = 符号長のヒストグラム
    // k = j = (0以外の)最小符号長
    // g = i = (0以外の)最大符号長
    k=BMAX;g=1;
    for(i=n;i--;j&&(j<k&&(k=j),j>g&&(g=j)))c[j=b[i]]++;
    if(c[0]==n)return;

    // mm = clamp(mm, [k,g])
    mm=min(mm>k?mm:k,g);

    for(j=k,y=1<<k;j<=g;j++,y<<=1)if((y-=c[j])<0){
      this.status=2;
      this.m=mm;
      return;
    }
    c[g]+=y>>1;

    // for i = 1..g-1: x[i] = sum[k=1..i-1] c[k].
    for(x[1]=j=i=0;++i<g;)x[i+1]=j+=c[i];

    // x = ?
    // v = 符号表?
    for(i=0;i<n;i++)if(j=b[i])v[x[j]++]=i;
    n=x[g];

    // Generate the Huffman codes and for each, make the table entries
    x[0]=i=0;    // first Huffman code is zero
    pidx=0;    // grab values in bit order
    h=-1;      // no tables yet--level -1
    w=lx[0]=0;    // no bits decoded yet
    q=null;      // ditto
    z=0;      // ditto

    // go through the bit lengths (k already is bits in shortest code)
    for(;k<=g;k++){
      a=c[k];
      while(a-->0){
        // here i is the Huffman code of length k bits for value v[pidx]
        // make tables up to required level
        while(k>w+lx[1+h]){
          w+=lx[1+h++];
          z=min(g-w,mm);
          
          f=1<<(j=k-w);
          if(f>a+1){
            f-=a+1;
            xp=k;
            while(++j<z&&(f<<=1)>c[++xp])f-=c[xp];
          }
          if(el>w)j=min(j,el-w);
          z=1<<j;
          lx[1+h]=j;

          q=[];for(o=0;o<z;o++)q[o]={}; // new HuftNode;

          var t=!tail;
          tail={list:0}; // new HuftList;
          if(t)this.root=tail;
//          tail.next=null;
          tail.list=q;
          u[h]=q;

          if(h>0){
            x[h]=i;
            r.b=lx[h];
            r.e=16+j;
            r.t=q;
            copyHuftNode(u[h-1][j=(i&(1<<w)-1)>>(w-lx[h])],r);
          }
        }

        // set up table entry in r
        r.b=k-w;
        if(pidx>=n){
          r.e=99;    // out of values--invalid code
        }else if(v[pidx]<s){
          r.e=v[pidx]<256?16:15; // 256 is end-of-block code
          r.n=v[pidx++];  // simple code is just the value
        }else{
          r.e=e[v[pidx]-s];  // non-simple--look up in lists
          r.n=d[v[pidx++]-s];
        }

        f=1<<(k-w);
        for(j=i>>w;j<z;j+=f)copyHuftNode(q[j],r);

        for(j=1<<(k-1);i^=j,j&~i;j>>=1);

        // backup over finished tables
        while((i&(1<<w)-1)!=x[h])w-=lx[h--];
      }
    }

    /* return actual size of base table */
    this.m=lx[1];

    this.status=y&&g-1?1:0;
  }

  /* routines (inflate) */

  function GET_BYTE(){
    if(inflate_data.length==inflate_pos)return -1;
    return inflate_data[inflate_pos++]&255;
  }

  function GETBITS(n){
    for(;bit_len<n;bit_len+=8)
      bit_buf|=GET_BYTE()<<bit_len;
    return bit_buf&MASK_BITS[n];
  }

  function DUMPBITS(n){
    bit_buf>>=n;
    bit_len-=n;
  }
  
  function NGDBITS(n){
    var r=GETBITS(n);
    DUMPBITS(n);
    return r;
  }

  function inflate_codes(buff,off,size){
    /* inflate (decompress) the codes in a deflated (compressed) block.
       Return an error code or zero if it all goes ok. */
    if(!size)return 0;

    // inflate the coded data
    var n=0;
    for(;;){      // do until end of block
      var t=tl.list[GETBITS(bl)];
      var e=t.e;
      while(e>16){
        if(e==99)return -1;
        DUMPBITS(t.b);
        e-=16;
        t=t.t[GETBITS(e)];
        e=t.e;
      }
      DUMPBITS(t.b);

      if(e==16){    // then it's a literal
        wp&=WSIZE_M;
        buff[off+n++]=slide[wp++]=t.n;
        if(n==size)return size;
        continue;
      }

      // exit if end of block
      if(e==15)break;

      // it's an EOB or a length

      // get length of block to copy
      copy_leng=t.n+NGDBITS(e);

      // decode distance of block to copy
      t=td.list[GETBITS(bd)];
      e=t.e;

      while(e>16){
        if(e==99)return -1;
        DUMPBITS(t.b);
        t=t.t[GETBITS(e-=16)];
        e=t.e;
      }
      DUMPBITS(t.b);
      copy_dist=wp-t.n-NGDBITS(e);

      // do the copy
      while(copy_leng&&n<size){
        copy_leng--;
        copy_dist&=WSIZE_M;
        wp&=WSIZE_M;
        buff[off+n++]=slide[wp++]=slide[copy_dist++];
      }

      if(n==size)return size;
    }

    method=-1; // done
    return n;
  }

  function inflate_stored(buff,off,size){
    /* "decompress" an inflated type 0 (stored) block. */

    // go to byte boundary
    DUMPBITS(bit_len&7);
    
    var n=NGDBITS(16);
    // <golf>
    // NEEDBITS(16);
    // if(n!=(~bit_buf&0xffff))return -1;
    if(n^GETBITS(16)^MASK_BITS[16])return -1;
    // </golf>
    DUMPBITS(16);
    copy_leng=n;
    n=0;
    while(copy_leng&&n<size){
      copy_leng--;
      wp&=WSIZE_M;
      buff[off+n++]=slide[wp++]=NGDBITS(8);
    }

    if(!copy_leng)method=-1; // done
    return n;
  }

  function inflate_fixed(buff,off,size){
    /* decompress an inflated type 1 (fixed Huffman codes) block.  We should
       either replace this with a custom decoder, or at least precompute the
       Huffman tables. */

    // if first time, set up tables for fixed blocks
    if(!fixed_tl){
      // <golf>
      // var l=[],i=0;
      // while(i<144)l[i++]=8;
      // while(i<256)l[i++]=9;
      // while(i<280)l[i++]=7;
      // while(i<288)l[i++]=8;
      for(var l=[],i=0;i<288;)l[i++]=i<144?8:i<256?9:i<280?7:8;
      // </golf>

      var h=new HuftBuild(l,288,257,cplens,cplext,fixed_bl=7);
      if(h.status)return -1;
      // if(h.status){
      //   alert("HufBuild error: "+h.status);
      //   return -1;
      // }
      fixed_tl=h.root;
      fixed_bl=h.m;

      // distance table
      for(i=30;i--;)l[i]=5;

      h=new HuftBuild(l,30,0,cpdist,cpdext,fixed_bd=5);
      if(h.status>1)return -1;
      // if(h.status>1){
      //   fixed_tl=0; // as HuftList
      //   alert("HufBuild error: "+h.status);
      //   return -1;
      // }
      fixed_td=h.root;
      fixed_bd=h.m;
    }

    tl=fixed_tl;
    td=fixed_td;
    bl=fixed_bl;
    bd=fixed_bd;
    return inflate_codes(buff,off,size);
  }

  function inflate_dynamic(buff,off,size){
    // decompress an inflated type 2 (dynamic Huffman codes) block.
    var i,j,l,n,t;
    var nb,nl,nd;
    var ll=calloc(316); // literal/length and distance code lengths
    var h;    // (HuftBuild)

    nl=257+NGDBITS(5);
    nd=1+NGDBITS(5);
    nb=4+NGDBITS(4);
    if(nl>286||nd>30)return -1;

    // read in bit-length-code lengths
    for(j=0;j<nb;)ll[border[j++]]=NGDBITS(3);
    for(;j<19;)ll[border[j++]]=0;

    // build decoding table for trees--single level, 7 bit lookup
    bl=7;
    h=new HuftBuild(ll,19,19,null,null,bl);
    if(h.status)return -1;  // incomplete code set

    tl=h.root;
    bl=h.m;

    // read in literal and distance code lengths
    n=nl+nd;
    i=l=0;
    while(i<n){
      t=tl.list[GETBITS(bl)];
      DUMPBITS(t.b);
      j=t.n;
      if(j<16){
        ll[i++]=l=j;
      }else{
        var x,y;
        if(j==16)x=2,y=3;
        else if(j==17)x=3,y=3,l=0;
        else x=7,y=11,l=0;
        
        j=y+NGDBITS(x);
        if(i+j>n)return -1;
        while(j-->0)ll[i++]=l;
      }
    }

    // build the decoding tables for literal/length and distance codes
    bl=lbits;
    h=new HuftBuild(ll,nl,257,cplens,cplext,bl);
    
    if(!bl||h.status)return -1;
    tl=h.root;
    bl=h.m;

    for(i=0;i<nd;i++)ll[i]=ll[i+nl];
    bd=dbits;
    h=new HuftBuild(ll,nd,0,cpdist,cpdext,bd);
    td=h.root;
    bd=h.m;
    
    if(!bd&&nl>257||h.status)return -1;

    // decompress until an end-of-block code
    return inflate_codes(buff,off,size);
  }

  function inflate_start(){
    if(!slide)
      slide=[]; //new Array(2*WSIZE_M+2); // 2*WSIZE == 2*(W_SIZE_M+1)
    wp=0;
    bit_buf=0;
    bit_len=0;
    method=-1;
    eof=0; //false;
    copy_leng=copy_dist=0;
    tl=null;
  }

  function inflate_internal(buff,off,size){
    // decompress an inflated entry
    var n,i;

    n=0;
    while(n<size){
      if(eof&&method==-1)return n;

      if(copy_leng>0){
        if(method!=STORED_BLOCK){
          // STATIC_TREES or DYN_TREES
          while(copy_leng&&n<size){
            copy_leng--;
            wp&=WSIZE_M;
            copy_dist&=WSIZE_M;
            buff[off+n++]=slide[wp++]=slide[copy_dist++];
          }
        }else{
          while(copy_leng&&n<size){
            copy_leng--;
            wp&=WSIZE_M;
            buff[off+n++]=slide[wp++]=NGDBITS(8);
          }
          if(copy_leng==0)method=-1; // done
        }
        if(n==size)return n;
      }

      if(method==-1){
        // <golf>
        // if(eof)break;
        // if(NGDBITS(1))eof=true;
        if(eof)break;
        eof=NGDBITS(1);
        // </golf>
        method=NGDBITS(2);
        tl=copy_leng=0;
      }
      
      var m=
        method==0?inflate_stored:
        method==1?tl?inflate_codes:inflate_fixed:
        method==2?tl?inflate_codes:inflate_dynamic:0;
      m?i=m(buff,off+n,size-n):i=-1;

      if(i==-1){
        if(eof)return 0;
        return -1;
      }
      
      n+=i;
    }
    return n;
  }

  return function(a){
    var out,buff,i,j;
    inflate_start();
    inflate_data=a;
    inflate_pos=0;

    buff=[]; //new Array(1024);
    out=[];
    while((i=inflate_internal(buff,0,1024))>0){
      for(j=0;j<i;j++)out.push(buff[j]);
    }
    inflate_data=null;
    return out;
  };
})();
//%end
//%m body body.r|\<mm\>|m|
//%m body body.r|\<BMAX\>|16|
//%m body body.r|\<N_MAX\>|288|
//%x body
