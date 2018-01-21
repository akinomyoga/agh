#%m frame
(function(){
var r=[
'0|1|var|if|return|this|function|while|for|16|new|2|else|8|break|7|null|push|99|3|256|4|charCodeAt|length|15|6|5|257|unshift|17|2',
'88|63|Array|30|19|fromCharCode|String|14|12|9|255|144|280|13|31|316|48|32767|60|258|227|1024|27|29|18|64|11|286'
].join("").split('|');
var s=[
'(6(){2 I;I=(6(){6 AI(a,b){4 a<b?a:b;}6 S(n,v){2 a=10 32(n);7(n--)a[n]=v;4 a;}2 K=47;2 AW=0;2 AO=39;2 AV=25;2 I,wp,Z=16;2 AJ,_,$;',
'2 U,P,G,T,C,O,tl,td,bl,bd,X,AF;2 i,j;2 AL=[];i=1<<29;7(i>>=1)AL.28(i-1);2 AA=[0,18,18];8(i=15;i;)AA.28(j=--i-!!i,j,j,j);2 AB=[50',
',49,0,0];8(i=52;i--;)AB.28(AB[0]-(1<<AA[i]));2 AD=[0,0];8(i=0;i<37;)AD.17(i,i++);2 AC=[1];8(i=0;i<53;)AC.17(AC[i]+(1<<AD[i++]));',
'2 AG=[9,29,54,0,i=13];7(--i)AG.17(i,9-i);6 AY(){5.AN=5.W=0;}6 AH(){5.e=5.b=5.n=5.t=0;}AH.prototype.AK=6(x){5.e=x.e;5.b=x.b;5.n=x',
'.n;5.t=x.t;};6 V(b,n,s,d,e,mm){5.N=9;5.AX=30;5.H=5.J=5.m=0;2 c=S(5.N+1,0);2 lx=S(5.N+1,0);2 r=10 AH();2 u=S(5.N,0);2 v=S(5.AX+1,',
'0);2 x=S(5.N+1,0);2 R=5.J=0;2 a,el,f,g,h,i,j,k,p,D,q,w,xp,y,z,o;el=n>20?b[20]:5.N;p=b;D=0;i=n;do c[p[D++]]++;7(--i);3(c[0]==n){5',
'.J=0;5.m=5.H=0;4;}8(j=1;j<=5.N&&!c[j];j++);k=j;3(mm<j)mm=j;8(i=5.N;i&&!c[i];i--);g=i;3(mm>i)mm=i;8(y=1<<j;j<=i;j++-i&&(y<<=1))3(',
'(y-=c[j])<0){5.H=11;5.m=mm;4;}c[i]+=y;x[1]=j=0;p=c;D=1;xp=11;7(--i>0)x[xp++]=j+=p[D++];p=b;D=0;i=0;do 3(j=p[D++])v[x[j]++]=i;7(+',
'+i<n);n=x[g];x[0]=i=0;p=v;D=0;h=-1;w=lx[0]=0;q=16;z=0;8(;k<=g;k++){a=c[k];7(a-->0){7(k>w+lx[1+h]){w+=lx[1+h++];z=AI(g-w,mm);f=1<',
'<(j=k-w);3(f>a+1){f-=a+1;xp=k;7(++j<z&&(f<<=1)>c[++xp])f-=c[xp];}3(el>w)j=AI(j,el-w);z=1<<j;lx[1+h]=j;q=[];8(o=0;o<z;o++)q[o]=10',
' AH();2 t=!R;R=10 AY();3(t)5.J=R;R.AN=16;R.W=q;u[h]=q;3(h>0){x[h]=i;r.b=lx[h];r.e=9+j;r.t=q;u[h-1][j=(i&(1<<w)-1)>>(w-lx[h])].AK',
'(r);}}r.b=k-w;3(D>=n){r.e=18;}12 3(p[D]<s){r.e=p[D]<20?9:24;r.n=p[D++];}12{r.e=e[p[D]-s];r.n=d[p[D++]-s];}f=1<<(k-w);8(j=i>>w;j<',
'z;j+=f)q[j].AK(r);8(j=1<<(k-1);i^=j,j&~i;j>>=1);7((i&(1<<w)-1)!=x[h])w-=lx[h--];}}5.m=lx[1];5.H=y&&g-1?1:0;}6 BA(){3(X.23==AF)4 ',
'-1;4 X.22(AF++)&0xff;}6 M(n){7(P<n){U|=BA()<<P;P+=13;}}6 Q(n){4 U&AL[n];}6 L(n){U>>=n;P-=n;}6 F(n){M(n);2 r=Q(n);L(n);4 r;}6 Y(B',
',E,A){3(!A)4 0;2 n=0;8(;;){M(bl);2 t=tl.W[Q(bl)];2 e=t.e;7(e>9){3(e==18)4 -1;L(t.b);e-=9;M(e);t=t.t[Q(e)];e=t.e;}L(t.b);3(e==9){',
'wp&=K;B[E+n++]=I[wp++]=t.n;3(n==A)4 A;continue;}3(e==24)14;C=t.n+F(e);M(bd);t=td.W[Q(bd)];e=t.e;7(e>9){3(e==18)4 -1;L(t.b);M(e-=',
'9);t=t.t[Q(e)];e=t.e;}L(t.b);O=wp-t.n-F(e);7(C&&n<A){C--;O&=K;wp&=K;B[E+n++]=I[wp++]=I[O++];}3(n==A)4 A;}G=-1;4 n;}6 AP(B,E,A){2',
' n=P&15;L(n);n=F(9);M(9);3(n!=(~U&0xffff))4 -1;L(9);C=n;n=0;7(C&&n<A){C--;wp&=K;B[E+n++]=I[wp++]=F(13);}3(!C)G=-1;4 n;}6 AS(B,E,',
'A){3(!Z){2 l=[];2 i=0;7(i<41)l[i++]=13;7(i<20)l[i++]=39;7(i<42)l[i++]=15;7(i<30)l[i++]=13;_=15;2 h=10 V(l,30,27,AB,AA,_);3(h.H){',
'alert("AZ error: "+h.H);4 -1;}Z=h.J;_=h.m;8(i=33;i--;)l[i]=26;$=26;h=10 V(l,33,0,AC,AD,$);3(h.H>1){Z=0;alert("AZ error: "+h.H);4',
' -1;}AJ=h.J;$=h.m;}tl=Z;td=AJ;bl=_;bd=$;4 Y(B,E,A);}6 AT(B,E,A){2 i,j,l,n,t;2 nb,nl,nd;2 ll=S(45,0);2 h;nl=27+F(26);nd=1+F(26);n',
'b=21+F(21);3(nl>57||nd>33)4 -1;8(j=0;j<nb;)ll[AG[j++]]=F(19);8(;j<34;)ll[AG[j++]]=0;bl=15;h=10 V(ll,34,34,16,16,bl);3(h.H)4 -1;t',
'l=h.J;bl=h.m;n=nl+nd;i=l=0;7(i<n){M(bl);t=tl.W[Q(bl)];L(t.b);j=t.n;3(j<9){ll[i++]=l=j;}12{2 x,y;3(j==9)x=11,y=19;12 3(j==29)x=19',
',y=19,l=0;12 x=15,y=56,l=0;j=y+F(x);3(i+j>n)4 -1;7(j-->0)ll[i++]=l;}}bl=AO;h=10 V(ll,nl,27,AB,AA,bl);3(!bl||h.H)4 -1;tl=h.J;bl=h',
'.m;8(i=0;i<nd;i++)ll[i]=ll[i+nl];bd=AV;h=10 V(ll,nd,0,AC,AD,bd);td=h.J;bd=h.m;3(!bd&&nl>27||h.H)4 -1;4 Y(B,E,A);}6 AQ(){3(!I)I=1',
'0 32(11*K+11);wp=0;U=0;P=0;G=-1;T=false;C=O=0;tl=16;}6 AR(B,E,A){2 n,i;n=0;7(n<A){3(T&&G==-1)4 n;3(C>0){3(G!=AW){7(C&&n<A){C--;w',
'p&=K;O&=K;B[E+n++]=I[wp++]=I[O++];}}12{7(C&&n<A){C--;wp&=K;B[E+n++]=I[wp++]=F(13);}3(C==0)G=-1;}3(n==A)4 n;}3(G==-1){3(T)14;3(F(',
'1))T=true;G=F(11);tl=0;C=0;}2 m=G==0?AP:G==1?tl?Y:AS:G==11?tl?Y:AT:0;m?i=m(B,E+n,A-n):i=-1;3(i==-1){3(T)4 0;4 -1;}n+=i;}4 n;}6 A',
'U(AM){2 AE,B;2 i,j;AQ();X=AM;AF=0;B=10 32(51);AE=[];7((i=AR(B,0,B.23))>0){8(j=0;j<i;j++)AE.17(36.35(B[j]));}X=0;4 AE.join("");}4',
' AU;})();2 H=[];8(2 i=20;i;)H[--i]=-1;8(i=55;i;)H["ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".22(--i)]=i;',
'6 F(b){4 H[b&40];};2 J=6(C){2 i=0;2 D=C.23;6 B(){2 c;do c=F(C.22(i++));7(i<D&&c<0);4 c;}2 A=[];6 o(c){A.17(36.35(c));}2 x,y,z,w;',
'7(i<D){3((x=B())<0)14;3((y=B())<0)14;o(x<<11|(y&46)>>21);3((z=B())<0)14;o((y&24)<<21|(z&48)>>11);3((w=B())<0)14;o((z&19)<<25|w);',
'}4 A.join("");};2 K=6(C){2 A=[];6 o(s){A.17(36.35(s));}2 i=0;6 B(){4 C.22(i++);}2 D=C.23;7(i<D){2 c=B();2 s=c>>21;3(s<13)o(c);12',
' 3(s==38||s==43)o((c&44)<<25|B()&31);12 3(s==37)o((c&24)<<38|(B()&31)<<25|B()&31);}4 A.join("");};4 6(s){4 K(I(J(s)));};})();'
].join("");
var inflate=eval(s.replace(/\b\d+\b/g,function($){return r[$];}));
})();
#%end
#%[inflate=1]
#%x inflate_and_eval
