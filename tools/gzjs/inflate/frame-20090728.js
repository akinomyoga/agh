#%m frame
(function(){
var r=[
'0|1|var|if|return|function|while|for|this|16|new|2|else|push|8|7|5|256|null|99|length|6|charCodeAt|257|3|288|fromCharCode|30|17|',
'19|String|Array|4|unshift|15|9|255|64|127|32767|31|316|286|144|280|258|27|1024|227|14|11|29|18'
].join("").split('|');
var s=[
'(5(){2 I;I=(5(){5 AI(a,b){4 a<b?a:b;}5 S(n,v){2 a=10 31(n);6(n--)a[n]=v;4 a;}2 K=39;2 AW=0;2 AO=35;2 AV=21;2 I,wp,Z=18;2 AJ,_,$;',
'2 U,P,G,T,C,O,tl,td,bl,bd,X,AF;2 i,j;2 AL=[];i=1<<28;6(i>>=1)AL.33(i-1);2 AA=[0,19,19];7(i=15;i;)AA.33(j=--i-!!i,j,j,j);2 AB=[48',
',45,0,0];7(i=46;i--;)AB.33(AB[0]-(1<<AA[i]));2 AD=[0,0];7(i=0;i<49;)AD.13(i,i++);2 AC=[1];7(i=0;i<51;)AC.13(AC[i]+(1<<AD[i++]));',
'2 AG=[9,28,52,0,i=14];6(--i)AG.13(i,9-i);5 AY(){8.W=0;}5 AH(){8.e=8.b=8.n=8.t=0;}AH.prototype.AK=5(x){8.e=x.e;8.b=x.b;8.n=x.n;8.',
't=x.t;};2 N=9;2 AX=25;5 V(b,n,s,d,e,mm){8.H=8.m=0;2 c=S(N+1,0);2 lx=S(N+1,0);2 r=10 AH();2 u=S(N,0);2 v=S(AX+1,0);2 x=S(N+1,0);2',
' R=8.J=0;2 a,el,f,g,h,i,j,k,p,D,q,w,xp,y,z,o;el=n>17?b[17]:N;p=b;D=0;i=n;do c[p[D++]]++;6(--i);3(c[0]==n)4;7(j=1;j<=N&&!c[j];j++',
');k=j;3(mm<j)mm=j;7(i=N;i&&!c[i];i--);g=i;3(mm>i)mm=i;7(y=1<<j;j<=i;j++-i&&(y<<=1))3((y-=c[j])<0){8.H=11;8.m=mm;4;}c[i]+=y;x[1]=',
'j=0;p=c;D=1;xp=11;6(--i>0)x[xp++]=j+=p[D++];p=b;D=0;i=0;do 3(j=p[D++])v[x[j]++]=i;6(++i<n);n=x[g];x[0]=i=0;p=v;D=0;h=-1;w=lx[0]=',
'0;q=18;z=0;7(;k<=g;k++){a=c[k];6(a-->0){6(k>w+lx[1+h]){w+=lx[1+h++];z=AI(g-w,mm);f=1<<(j=k-w);3(f>a+1){f-=a+1;xp=k;6(++j<z&&(f<<',
'=1)>c[++xp])f-=c[xp];}3(el>w)j=AI(j,el-w);z=1<<j;lx[1+h]=j;q=[];7(o=0;o<z;o++)q[o]=10 AH();2 t=!R;R=10 AY();3(t)8.J=R;R.W=q;u[h]',
'=q;3(h>0){x[h]=i;r.b=lx[h];r.e=9+j;r.t=q;u[h-1][j=(i&(1<<w)-1)>>(w-lx[h])].AK(r);}}r.b=k-w;3(D>=n){r.e=19;}12 3(p[D]<s){r.e=p[D]',
'<17?9:34;r.n=p[D++];}12{r.e=e[p[D]-s];r.n=d[p[D++]-s];}f=1<<(k-w);7(j=i>>w;j<z;j+=f)q[j].AK(r);7(j=1<<(k-1);i^=j,j&~i;j>>=1);6((',
'i&(1<<w)-1)!=x[h])w-=lx[h--];}}8.m=lx[1];8.H=y&&g-1?1:0;}5 BA(){3(X.20==AF)4-1;4 X.22(AF++)&0xff;}5 M(n){6(P<n){U|=BA()<<P;P+=14',
';}}5 Q(n){4 U&AL[n];}5 L(n){U>>=n;P-=n;}5 F(n){M(n);2 r=Q(n);L(n);4 r;}5 Y(B,E,A){3(!A)4 0;2 n=0;7(;;){M(bl);2 t=tl.W[Q(bl)];2 e',
'=t.e;6(e>9){3(e==19)4-1;L(t.b);e-=9;M(e);t=t.t[Q(e)];e=t.e;}L(t.b);3(e==9){wp&=K;B[E+n++]=I[wp++]=t.n;3(n==A)4 A;continue;}3(e==',
'34)break;C=t.n+F(e);M(bd);t=td.W[Q(bd)];e=t.e;6(e>9){3(e==19)4-1;L(t.b);M(e-=9);t=t.t[Q(e)];e=t.e;}L(t.b);O=wp-t.n-F(e);6(C&&n<A',
'){C--;O&=K;wp&=K;B[E+n++]=I[wp++]=I[O++];}3(n==A)4 A;}G=-1;4 n;}5 AP(B,E,A){2 n=P&15;L(n);n=F(9);M(9);3(n!=(~U&0xffff))4-1;L(9);',
'C=n;n=0;6(C&&n<A){C--;wp&=K;B[E+n++]=I[wp++]=F(14);}3(!C)G=-1;4 n;}5 AS(B,E,A){3(!Z){2 l=[];2 i=0;6(i<43)l[i++]=14;6(i<17)l[i++]',
'=35;6(i<44)l[i++]=15;6(i<25)l[i++]=14;_=15;2 h=10 V(l,25,23,AB,AA,_);3(h.H){alert("AZ error: "+h.H);4-1;}Z=h.J;_=h.m;7(i=27;i--;',
')l[i]=16;$=16;h=10 V(l,27,0,AC,AD,$);3(h.H>1){Z=0;alert("AZ error: "+h.H);4-1;}AJ=h.J;$=h.m;}tl=Z;td=AJ;bl=_;bd=$;4 Y(B,E,A);}5 ',
'AT(B,E,A){2 i,j,l,n,t;2 nb,nl,nd;2 ll=S(41,0);2 h;nl=23+F(16);nd=1+F(16);nb=32+F(32);3(nl>42||nd>27)4-1;7(j=0;j<nb;)ll[AG[j++]]=',
'F(24);7(;j<29;)ll[AG[j++]]=0;bl=15;h=10 V(ll,29,29,18,18,bl);3(h.H)4-1;tl=h.J;bl=h.m;n=nl+nd;i=l=0;6(i<n){M(bl);t=tl.W[Q(bl)];L(',
't.b);j=t.n;3(j<9){ll[i++]=l=j;}12{2 x,y;3(j==9)x=11,y=24;12 3(j==28)x=24,y=24,l=0;12 x=15,y=50,l=0;j=y+F(x);3(i+j>n)4-1;6(j-->0)',
'll[i++]=l;}}bl=AO;h=10 V(ll,nl,23,AB,AA,bl);3(!bl||h.H)4-1;tl=h.J;bl=h.m;7(i=0;i<nd;i++)ll[i]=ll[i+nl];bd=AV;h=10 V(ll,nd,0,AC,A',
'D,bd);td=h.J;bd=h.m;3(!bd&&nl>23||h.H)4-1;4 Y(B,E,A);}5 AQ(){3(!I)I=10 31(11*K+11);wp=0;U=0;P=0;G=-1;T=false;C=O=0;tl=18;}5 AR(B',
',E,A){2 n,i;n=0;6(n<A){3(T&&G==-1)4 n;3(C>0){3(G!=AW){6(C&&n<A){C--;wp&=K;O&=K;B[E+n++]=I[wp++]=I[O++];}}12{6(C&&n<A){C--;wp&=K;',
'B[E+n++]=I[wp++]=F(14);}3(C==0)G=-1;}3(n==A)4 n;}3(G==-1){3(T)break;3(F(1))T=true;G=F(11);tl=0;C=0;}2 m=G==0?AP:G==1?tl?Y:AS:G==',
'11?tl?Y:AT:0;m?i=m(B,E+n,A-n):i=-1;3(i==-1){3(T)4 0;4-1;}n+=i;}4 n;}5 AU(AM){2 AE,B;2 i,j;AQ();X=AM;AF=0;B=10 31(47);AE=[];6((i=',
'AR(B,0,B.20))>0){7(j=0;j<i;j++)AE.13(30.26(B[j]));}X=0;4 AE.join("");}4 AU;})();2 H=[];7(2 i=17;i;)H[--i]=-1;7(i=37;H["ABCDEFGHI',
'JKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".22(--i)]=i;);2 J=5(C){2 i=0,b=0,A=[];5 B(){2 c=-1;6(i<C.20&&c<0)c=H[C.2',
'2(i++)&36];b=b<<21|c;4 c+1;}5 o(w){A.13(30.26(b>>w&36));}7(;B()&&B()&&B(o(32))&&B(o(11));o(0));4 A.join("");};2 K=5(C){2 i=0,c=0',
',s,A=[];5 B(){s=C.22(i++);c=c<<21|38&s;}5 o(){A.13(30.26(c));c=0;}7(;i<C.20;o(s>16&&(c&=40,s-21&&B(),B())))B(),s>>=16;4 A.join("',
'");};4 5(s){4 K(I(J(s)));};})();'
].join("");
var inflate=eval(s.replace(/\b\d+\b/g,function($){return r[$];}));
})();
#%end
#%[inflate=1]
#%x inflate_and_eval
