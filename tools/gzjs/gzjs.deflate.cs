// -*- coding:utf-8 -*-
using Gen=System.Collections.Generic;

class Deflator{
	private static void alert(string msg){
		System.Console.WriteLine("mwg.deflate> {0}",msg);
	}

	/* constant parameters */
	const int WSIZE=32768;		// Sliding Window size
	const int STORED_BLOCK=0;
	const int STATIC_TREES=1;
	const int DYN_TREES   =2;

	/* for deflate */
	const int DEFAULT_LEVEL=6;
	const bool FULL_SEARCH=true;
	const int INBUFSIZ=32768;	// Input buffer size
	const int INBUF_EXTRA=64;	// Extra buffer
	const int OUTBUFSIZ=1024*8;
	const int window_size=2*WSIZE;
	const int MIN_MATCH=3;
	const int MAX_MATCH=258;
	const int BITS=16;
	// for SMALL_MEM
	const int LIT_BUFSIZE=0x2000;
	const int HASH_BITS=13;

	// for MEDIUM_MEM
	// var LIT_BUFSIZE=0x4000;
	// var HASH_BITS=14;
	// for BIG_MEM
	// var LIT_BUFSIZE=0x8000;
	// var HASH_BITS=15;
	static Deflator(){
#pragma warning disable 162
		if(LIT_BUFSIZE>INBUFSIZ)
			alert("error: INBUFSIZ is too small");
		if((WSIZE<<1)>(1<<BITS))
			alert("error: WSIZE is too large");
		if(HASH_BITS>BITS-1)
			alert("error: HASH_BITS is too large");
		if(HASH_BITS<8||MAX_MATCH!=258)
			alert("error: Code too clever");
#pragma warning restore 162
	}
	const int DIST_BUFSIZE=LIT_BUFSIZE;
	const int HASH_SIZE=1<<HASH_BITS;
	const int HASH_MASK=HASH_SIZE-1;
	const int WMASK=WSIZE-1;
	const int NIL=0;// Tail of hash chains
	const int TOO_FAR=4096;
	const int MIN_LOOKAHEAD=MAX_MATCH+MIN_MATCH+1;
	const int MAX_DIST=WSIZE-MIN_LOOKAHEAD;
	const int SMALLEST=1;
	const int MAX_BITS=15;
	const int MAX_BL_BITS=7;
	const int LENGTH_CODES=29;
	const int LITERALS =256;
	const int END_BLOCK=256;
	const int L_CODES=LITERALS+1+LENGTH_CODES;
	const int D_CODES=30;
	const int BL_CODES=19;
	const int REP_3_6=16;
	const int REPZ_3_10=17;
	const int REPZ_11_138=18;
	const int HEAP_SIZE=2*L_CODES+1;
	const int H_SHIFT=(HASH_BITS+MIN_MATCH-1)/MIN_MATCH;

	/* variables */
	DeflateBuffer free_queue;
	DeflateBuffer qhead,qtail;
	bool initflag;
	byte[] outbuf=null;
	int outcnt,outoff;
	bool complete;
	byte[] win;
	int[] d_buf;
	int[] l_buf;
	int[] prev;
	int bi_buf; // ushort
	int bi_valid;
	int block_start;
	int ins_h;
	int hash_head;
	int prev_match;
	int match_available;
	int match_length;
	int prev_length;
	int strstart;
	int match_start;
	bool eofile;
	int lookahead;
	int max_chain_length;
	int max_lazy_match;
	int compr_level;
	int good_match;
	int nice_match;
	DeflateCT[] dyn_ltree;
	DeflateCT[] dyn_dtree;
	DeflateCT[] static_ltree;
	DeflateCT[] static_dtree;
	DeflateCT[] bl_tree;
	DeflateTreeDesc l_desc;
	DeflateTreeDesc d_desc;
	DeflateTreeDesc bl_desc;
	int[] bl_count;
	int[] heap;
	int heap_len;
	int heap_max;
	int[] depth;
	int[] length_code;
	int[] dist_code;
	int[] base_length;
	int[] base_dist;
	int[] flag_buf;
	int last_lit;
	int last_dist;
	int last_flags;
	int flags;
	int flag_bit;
	int opt_len;
	int static_len;
	byte[] deflate_data;
	int deflate_pos;

	/* constant tables */
	static readonly int[] extra_lbits=new int[]{0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0};
	static readonly int[] extra_dbits=new int[]{0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13};
	static readonly int[] extra_blbits=new int[]{0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7};
	static readonly int[] bl_order=new int[]{16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15};
	static DeflateConfiguration[] configuration_table=new DeflateConfiguration[]{
		new DeflateConfiguration(0,   0,  0,   0),
		new DeflateConfiguration(4,   4,  8,   4),
		new DeflateConfiguration(4,   5, 16,   8),
		new DeflateConfiguration(4,   6, 32,  32),
		new DeflateConfiguration(4,   4, 16,  16),
		new DeflateConfiguration(8,  16, 32,  32),
		new DeflateConfiguration(8,  16,128, 128),
		new DeflateConfiguration(8,  32,128, 256),
		new DeflateConfiguration(32,128,258,1024),
		new DeflateConfiguration(32,258,258,4096)
	};

	/* objects (deflate)*/

	class DeflateCT{
		public int fc=0;// frequency count or bit string
		public int dl=0;// father node in Huffman tree or length of bit string
	}

	class DeflateTreeDesc{
		public DeflateCT[] dyn_tree=null;	// the dynamic tree
		public DeflateCT[] static_tree=null;	// corresponding static tree or NULL
		public int[] extra_bits=null;	// extra bits for each code or NULL
		public int extra_base=0;	// base index for extra_bits
		public int elems=0;		// max number of elements in the tree
		public int max_length=0;	// max bit length for the codes
		public int max_code=0;		// largest code with non zero frequency
	}

	class DeflateConfiguration{
		public int good_length;
		public int max_lazy;
		public int nice_length;
		public int max_chain;

		public DeflateConfiguration(int a,int b,int c,int d){
			this.good_length=a;// reduce lazy search above this match length
			this.max_lazy=b;   // do not perform lazy search above this match length
			this.nice_length=c;// quit search above this match length
			this.max_chain=d;
		}
	}

	class DeflateBuffer{
		public DeflateBuffer next=null;
		public int len=0;
		public byte[] ptr=new byte[OUTBUFSIZ];
		public int off=0;
	}

	/* routines (deflate)*/

	DeflateCT[] new_ctarray(int n){
		DeflateCT[] r=new DeflateCT[n];
		for(int i=0;i<n;i++)r[i]=new DeflateCT();
		return r;
	}

	void deflate_start(int level){
		if(level==0)
			level=DEFAULT_LEVEL;
		else if(level<1)
			level=1;
		else if(level>9)
			level=9;

		this.compr_level=level;
		this.initflag=false;
		this.eofile=false;
		if(outbuf!=null)return;

		this.free_queue=this.qhead=this.qtail=null;
		this.outbuf=new byte[OUTBUFSIZ];
		this.win=new byte[window_size];
		this.d_buf=new int[DIST_BUFSIZE];
		this.l_buf=new int[INBUFSIZ+INBUF_EXTRA];
		this.prev=new int[1<<BITS];

		this.dyn_ltree=new_ctarray(HEAP_SIZE);
		this.dyn_dtree=new_ctarray(2*D_CODES+1);
		this.static_ltree=new_ctarray(L_CODES+2);
		this.static_dtree=new_ctarray(D_CODES);
		this.bl_tree=new_ctarray(2*BL_CODES+1);

		this.l_desc=new DeflateTreeDesc();
		this.d_desc=new DeflateTreeDesc();
		this.bl_desc=new DeflateTreeDesc();
		this.bl_count=new int[MAX_BITS+1];
		this.heap=new int[2*L_CODES+1];
		this.depth=new int[2*L_CODES+1];
		this.length_code=new int[MAX_MATCH-MIN_MATCH+1];
		this.dist_code=new int[512];
		this.base_length=new int[LENGTH_CODES];
		this.base_dist=new int[D_CODES];
		this.flag_buf=new int[LIT_BUFSIZE/8];
	}

	/*
	function deflate_end(){
		free_queue=qhead=qtail=null;
		outbuf=null;
		win=null;
		d_buf=null;
		l_buf=null;
		prev=null;
		dyn_ltree=null;
		dyn_dtree=null;
		static_ltree=null;
		static_dtree=null;
		bl_tree=null;
		l_desc=null;
		d_desc=null;
		bl_desc=null;
		bl_count=null;
		heap=null;
		depth=null;
		length_code=null;
		dist_code=null;
		base_length=null;
		base_dist=null;
		flag_buf=null;
	}
	//*/

	void reuse_queue(DeflateBuffer p){
		p.next=free_queue;
		free_queue=p;
	}

	DeflateBuffer new_queue(){
		DeflateBuffer p;

		if(free_queue!=null){
			p=this.free_queue;
			this.free_queue=free_queue.next;
		}else{
			p=new DeflateBuffer();
		}
		p.next=null;
		p.len=p.off=0;

		return p;
	}

	int head1(int i){
		return prev[WSIZE+i];
	}

	int head2(int i,int val){
		return prev[WSIZE+i]=val;
	}

	/* put_byte is used for the compressed output,put_ubyte for the
	*uncompressed output. However unlzw()uses window for its
	*suffix table instead of its output buffer,so it does not use put_ubyte
	*(to be cleaned up).
	 */
	void put_byte(byte c){
		this.outbuf[this.outoff+this.outcnt++]=c;
		if(this.outoff+this.outcnt==OUTBUFSIZ)
			this.qoutbuf();
	}

	/* Output a 16 bit value,lsb first */
	void put_short(ushort w){
		w&=0xffff;
		if(this.outoff+this.outcnt<OUTBUFSIZ-2){
			this.outbuf[this.outoff+this.outcnt++]=(byte)w;
			this.outbuf[this.outoff+this.outcnt++]=(byte)(w>>8);
		}else{
			this.put_byte((byte)w);
			this.put_byte((byte)(w>>8));
		}
	}

	/* ==========================================================================
	*Insert string s in the dictionary and set match_head to the previous head
	*of the hash chain (the most recent string with same hash key). Return
	*the previous length of the hash chain.
	*IN  assertion: all calls to to INSERT_STRING are made with consecutive
	*   input characters and the first MIN_MATCH bytes of s are valid
	*   (except for the last MIN_MATCH-1 bytes of the input file).
	 */
	void INSERT_STRING(){
		this.ins_h=((this.ins_h<<H_SHIFT)^(win[this.strstart+MIN_MATCH-1]&0xff))&HASH_MASK;
		this.hash_head=head1(this.ins_h);
		this.prev[strstart&WMASK]=this.hash_head;
		this.head2(ins_h,strstart);
	}

	/* Send a code of the given tree. c and tree must not have side effects */
	void SEND_CODE(int c,DeflateCT[] tree){
		this.send_bits(tree[c].fc,tree[c].dl);
	}

	/* Mapping from a distance to a distance code. dist is the distance-1 and
	*must not have side effects. dist_code[256] and dist_code[257] are never
	*used.
	 */
	byte D_CODE(int dist){
		return (byte)(dist<256?dist_code[dist]:dist_code[256+(dist>>7)]);
	}

	/* ==========================================================================
	*Compares to subtrees,using the tree depth as tie breaker when
	*the subtrees have equal frequency. This minimizes the worst case length.
	 */
	bool SMALLER(DeflateCT[] tree,int n,int m){
		return tree[n].fc<tree[m].fc||tree[n].fc==tree[m].fc&&depth[n]<=depth[m];
	}

	/* ==========================================================================
	*read string data
	 */
	int read_buff(byte[] buff,int offset,int n){
		int i;
		for(i=0;i<n&&deflate_pos<deflate_data.Length;i++)
			buff[offset+i]=(byte)deflate_data[deflate_pos++];
		return i;
	}

	/* ==========================================================================
	*Initialize the "longest match" routines for a new file
	 */
	void lm_init(){

		/* Initialize the hash table. */
		for(int j=0;j<HASH_SIZE;j++)
		//	head2(j,NIL);
			prev[WSIZE+j]=0;
		/* prev will be initialized on the fly */

		/* Set the default configuration parameters:
		 */
		max_lazy_match=configuration_table[compr_level].max_lazy;
		good_match    =configuration_table[compr_level].good_length;
#pragma warning disable 162
		if(!FULL_SEARCH) nice_match=configuration_table[compr_level].nice_length;
#pragma warning restore 162
		max_chain_length=configuration_table[compr_level].max_chain;

		strstart=0;
		block_start=0;

		lookahead=read_buff(win,0,2*WSIZE);
		if(lookahead<=0){
			eofile=true;
			lookahead=0;
			return;
		}
		eofile=false;
		/* Make sure that we always have enough lookahead. This is important
		*if input comes from a device such as a tty.
		 */
		while(lookahead<MIN_LOOKAHEAD&&!eofile)
			fill_window();

		/* If lookahead<MIN_MATCH,ins_h is garbage,but this is
		*not important since only literal bytes will be emitted.
		 */
		ins_h=0;
		for(int j=0;j<MIN_MATCH-1;j++){
		//      UPDATE_HASH(ins_h,window[j]);
			ins_h=((ins_h<<H_SHIFT)^(win[j]&0xff))&HASH_MASK;
		}
	}

	/* ==========================================================================
	*Set match_start to the longest match starting at the given string and
	*return its length. Matches shorter or equal to prev_length are discarded,
	*in which case the result is equal to prev_length and match_start is
	*garbage.
	*IN assertions: cur_match is the head of the hash chain for the current
	*  string (strstart)and its distance is<=MAX_DIST,and prev_length>=1
	 */
	int longest_match(int cur_match){
		int chain_length=this.max_chain_length;// max hash chain length
		int scanp=this.strstart;// current string
		int matchp;		// matched string
		int len;		// length of current match
		int best_len=this.prev_length;	// best match length so far

		/* Stop when cur_match becomes<=limit. To simplify the code,
		*we prevent matches with the string of window index 0.
		 */
		int limit=(strstart>MAX_DIST?strstart-MAX_DIST:NIL);

		int strendp=strstart+MAX_MATCH;
		byte scan_end1=win[scanp+best_len-1];
		byte scan_end =win[scanp+best_len];

		/* Do not waste too much time if we already have a good match: */
		if(prev_length>=good_match)
			chain_length >>=2;

	//  Assert(encoder->strstart<=window_size-MIN_LOOKAHEAD,"insufficient lookahead");

		do{
		//    Assert(cur_match<encoder->strstart,"no future");
			matchp=cur_match;

			/* Skip to next match if the match length cannot increase
				* or if the match length is less than 2:
			*/
			if(win[matchp+best_len]		!=scan_end  
			   ||win[matchp+best_len-1]	!=scan_end1 
			   ||win[matchp]			!=win[scanp] 
			   ||win[++matchp]			!=win[scanp+1]
			){
				continue;
			}

			/* The check at best_len-1 can be removed because it will be made
				*again later. (This heuristic is not always a win.)
				*It is not necessary to compare scan[2] and match[2] since they
				*are always equal when the other bytes match,given that
				*the hash keys are equal and that HASH_BITS>=8.
				 */
			scanp+=2;
			matchp++;

			/* We check for insufficient lookahead only every 8th comparison;
				*the 256th check will be made at strstart+258.
				 */
			while(
				win[++scanp]==win[++matchp]&&
				win[++scanp]==win[++matchp]&&
				win[++scanp]==win[++matchp]&&
				win[++scanp]==win[++matchp]&&
				win[++scanp]==win[++matchp]&&
				win[++scanp]==win[++matchp]&&
				win[++scanp]==win[++matchp]&&
				win[++scanp]==win[++matchp]&&
				scanp<strendp
			);

			len=MAX_MATCH-(strendp-scanp);
			scanp=strendp-MAX_MATCH;

			if(len>best_len){
				match_start=cur_match;
				best_len=len;
#pragma warning disable 162
				if(FULL_SEARCH){
					if(len>=MAX_MATCH)break;
				}else{
					if(len>=nice_match)break;
				}
#pragma warning restore 162

				scan_end1=win[scanp+best_len-1];
				scan_end =win[scanp+best_len];
			}
		}while((cur_match=prev[cur_match&WMASK])>limit&&0!=--chain_length);

		return best_len;
	}

	/* ==========================================================================
	*Fill the window when the lookahead becomes insufficient.
	*Updates strstart and lookahead,and sets eofile if end of input file.
	*IN assertion: lookahead<MIN_LOOKAHEAD&&strstart+lookahead>0
	*OUT assertions: at least one byte has been read,or eofile is set;
	*   file reads are performed for at least two bytes (required for the
	*   translate_eol option).
	 */
	void fill_window(){
		// Amount of free space at the end of the window.
		int more=window_size-lookahead-strstart;

		/* If the window is almost full and there is insufficient lookahead,
		*move the upper half to the lower one to make room in the upper half.
		 */
		if(more==-1){
			/* Very unlikely,but possible on 16 bit machine if strstart==0
				*and lookahead==1 (input done one byte at time)
				 */
			more--;
		}else if(strstart>=WSIZE+MAX_DIST){
			/* By the IN assertion,the window is not empty so we can't confuse
				*more==0 with more==64K on a 16 bit machine.
				 */
		//	Assert(window_size==(ulg)2*WSIZE,"no sliding with BIG_MEM");

		//	System.arraycopy(window,WSIZE,window,0,WSIZE);
			for(int n=0;n<WSIZE;n++)
				win[n]=win[n+WSIZE];
		      
			match_start-=WSIZE;
			strstart   -=WSIZE;/* we now have strstart>=MAX_DIST: */
			block_start-=WSIZE;

			for(int n=0;n<HASH_SIZE;n++){
				int m=head1(n);
				head2(n,m>=WSIZE?m-WSIZE:NIL);
			}
			for(int n=0;n<WSIZE;n++){
				/* If n is not on any hash chain,prev[n] is garbage but
				*its value will never be used.
				 */
				int m=prev[n];
				prev[n]=(m>=WSIZE?m-WSIZE:NIL);
			}
			more+=WSIZE;
		}
		// At this point,more>=2
		if(!eofile){
			int n=read_buff(win,strstart+lookahead,more);
			if(n<=0){
				eofile=true;
			}else{
				lookahead+=n;
			}
		}
	}

	/* ==========================================================================
	*Processes a new input file and return its compressed length. This
	*function does not perform lazy evaluationof matches and inserts
	*new strings in the dictionary only for unmatched strings or for short
	*matches. It is used only for the fast compression options.
	 */
	void deflate_fast(){
		while(lookahead!=0&&qhead==null){
			bool flush;// set if current block must be flushed

			/* Insert the string window[strstart .. strstart+2] in the
			*dictionary,and set hash_head to the head of the hash chain:
			 */
			INSERT_STRING();

			/* Find the longest match,discarding those<=prev_length.
			*At this point we have always match_length<MIN_MATCH
			 */
			if(hash_head!=NIL&&strstart-hash_head<=MAX_DIST){
				/* To simplify the code,we prevent matches with the string
				*of window index 0 (in particular we have to avoid a match
				*of the string with itself at the start of the input file).
				 */
				match_length=longest_match(hash_head);
				/* longest_match()sets match_start */
				if(match_length>lookahead)
					match_length=lookahead;
			}
			if(match_length>=MIN_MATCH){
		//	    check_match(strstart,match_start,match_length);

				flush=ct_tally(strstart-match_start,
						 match_length-MIN_MATCH);
				lookahead-=match_length;

				/* Insert new strings in the hash table only if the match length
				*is not too large. This saves time but degrades compression.
				 */
				if(match_length<=max_lazy_match){
					match_length--;// string at strstart already in hash table
					do{
						strstart++;
						INSERT_STRING();
						/* strstart never exceeds WSIZE-MAX_MATCH,so there are
						*always MIN_MATCH bytes ahead. If lookahead<MIN_MATCH
						*these bytes are garbage,but it does not matter since
						*the next lookahead bytes will be emitted as literals.
						 */
					}while(--match_length!=0);
					strstart++;
				}else{
					strstart+=match_length;
					match_length=0;
					ins_h=win[strstart]&0xff;
			//		UPDATE_HASH(ins_h,window[strstart+1]);
					ins_h=((ins_h<<H_SHIFT)^(win[strstart+1]&0xff))&HASH_MASK;

			//#if MIN_MATCH!=3
			//		Call UPDATE_HASH()MIN_MATCH-3 more times
			//#endif

				}
			}else{
				/* No match,output a literal byte */
				flush=ct_tally(0,win[strstart]&0xff);
				lookahead--;
				strstart++;
			}
			if(flush){
				flush_block(0);
				block_start=strstart;
			}

			/* Make sure that we always have enough lookahead,except
			*at the end of the input file. We need MAX_MATCH bytes
			*for the next match,plus MIN_MATCH bytes to insert the
			*string following the next match.
			 */
			while(lookahead<MIN_LOOKAHEAD&&!eofile)
			fill_window();
		}
	}

	void deflate_better(){
		/* Process the input block. */
		while(lookahead!=0&&qhead==null){
			/* Insert the string window[strstart .. strstart+2] in the
			*dictionary,and set hash_head to the head of the hash chain:
			 */
			INSERT_STRING();

			/* Find the longest match,discarding those<=prev_length.
			 */
			prev_length=match_length;
			prev_match=match_start;
			match_length=MIN_MATCH-1;

			if(hash_head!=NIL &&
				prev_length<max_lazy_match &&
				strstart-hash_head<=MAX_DIST
			){
				/* To simplify the code,we prevent matches with the string
				*of window index 0 (in particular we have to avoid a match
				*of the string with itself at the start of the input file).
				 */
				match_length=longest_match(hash_head);
				/* longest_match()sets match_start */
				if(match_length>lookahead)
					match_length=lookahead;

				/* Ignore a length 3 match if it is too distant: */
				if(match_length==MIN_MATCH &&
				   strstart-match_start>TOO_FAR){
					/* If prev_match is also MIN_MATCH,match_start is garbage
					*but we will ignore the current match anyway.
					 */
					match_length--;
				}
			}
			/* If there was a match at the previous step and the current
			*match is not better,output the previous match:
			 */
			if(prev_length>=MIN_MATCH &&	match_length<=prev_length){
				bool flush;// set if current block must be flushed

		//	    check_match(strstart-1,prev_match,prev_length);
				flush=ct_tally(strstart-1-prev_match,
						 prev_length-MIN_MATCH);

				/* Insert in hash table all strings up to the end of the match.
				*strstart-1 and strstart are already inserted.
				 */
				lookahead-=prev_length-1;
				prev_length-=2;
				do{
					strstart++;
					INSERT_STRING();
					/* strstart never exceeds WSIZE-MAX_MATCH,so there are
					*always MIN_MATCH bytes ahead. If lookahead<MIN_MATCH
					*these bytes are garbage,but it does not matter since the
					*next lookahead bytes will always be emitted as literals.
					 */
				}while(--prev_length!=0);
				match_available=0;
				match_length=MIN_MATCH-1;
				strstart++;
				if(flush){
					flush_block(0);
					block_start=strstart;
				}
			}else if(match_available!=0){
				/* If there was no match at the previous position,output a
				*single literal. If there was a match but the current match
				*is longer,truncate the previous match to a single literal.
				 */
				if(ct_tally(0,win[strstart-1]&0xff)){
					flush_block(0);
					block_start=strstart;
				}
				strstart++;
				lookahead--;
			}else{
				/* There is no previous match to compare with,wait for
				*the next step to decide.
				 */
				match_available=1;
				strstart++;
				lookahead--;
			}

			/* Make sure that we always have enough lookahead,except
			*at the end of the input file. We need MAX_MATCH bytes
			*for the next match,plus MIN_MATCH bytes to insert the
			*string following the next match.
			 */
			while(lookahead<MIN_LOOKAHEAD&&!eofile)
				fill_window();
		}
	}

	void init_deflate(){
		if(eofile)return;
		bi_buf=0;
		bi_valid=0;
		ct_init();
		lm_init();

		qhead=null;
		outcnt=0;
		outoff=0;

		if(compr_level<=3){
			prev_length=MIN_MATCH-1;
			match_length=0;
		}else{
			match_length=MIN_MATCH-1;
			match_available=0;
		}

		complete=false;
	}

	/* ==========================================================================
	*Same as above,but achieves better compression. We use a lazy
	*evaluation for matches: a match is finally adopted only if there is
	*no better match at the next window position.
	 */
	int deflate_internal(byte[] buff,int off,int buff_size){
		int n;

		if(!initflag){
			init_deflate();
			initflag=true;
			if(lookahead==0){ // empty
				complete=true;
				return 0;
			}
		}

		if((n=qcopy(buff,off,buff_size))==buff_size)return buff_size;

		if(complete)return n;

		if(compr_level<=3)// optimized for speed
			deflate_fast();
		else{
			deflate_better();
		}
		if(lookahead==0){
			if(match_available!=0)
				ct_tally(0,win[strstart-1]&0xff);
			flush_block(1);
			complete=true;
		}
		return n+qcopy(buff,n+off,buff_size-n);
	}

	int qcopy(byte[] buff,int off,int buff_size){
		int n,i,j;

		n=0;
		while(qhead!=null&&n<buff_size){
			i=buff_size-n;
			if(i>qhead.len)i=qhead.len;
		//      System.arraycopy(qhead.ptr,qhead.off,buff,off+n,i);
			for(j=0;j<i;j++)buff[off+n+j]=qhead.ptr[qhead.off+j];
			
			qhead.off+=i;
			qhead.len-=i;
			n+=i;
			if(qhead.len==0){
				DeflateBuffer p=qhead;
				qhead=qhead.next;
				reuse_queue(p);
			}
		}

		if(n==buff_size)return n;

		if(outoff<outcnt){
			i=buff_size-n;
			if(i>outcnt-outoff)i=outcnt-outoff;
			// System.arraycopy(outbuf,outoff,buff,off+n,i);
			for(j=0;j<i;j++)buff[off+n+j]=outbuf[outoff+j];
			outoff+=i;
			n+=i;
			if(outcnt==outoff)outcnt=outoff=0;
		}
		return n;
	}

	/* ==========================================================================
	*Allocate the match buffer,initialize the various tables and save the
	*location of the internal file attribute (ascii/binary)and method
	*(DEFLATE/STORE).
	 */
	void ct_init(){
		int n;	// iterates over tree elements
		int bits;	// bit counter
		int code;	// code value
		int dist;	// distance index

		if(static_dtree[0].dl!=0)return;// ct_init already called

		l_desc.dyn_tree		=dyn_ltree;
		l_desc.static_tree	=static_ltree;
		l_desc.extra_bits	=extra_lbits;
		l_desc.extra_base	=LITERALS+1;
		l_desc.elems		=L_CODES;
		l_desc.max_length	=MAX_BITS;
		l_desc.max_code		=0;

		d_desc.dyn_tree		=dyn_dtree;
		d_desc.static_tree	=static_dtree;
		d_desc.extra_bits	=extra_dbits;
		d_desc.extra_base	=0;
		d_desc.elems		=D_CODES;
		d_desc.max_length	=MAX_BITS;
		d_desc.max_code		=0;

		bl_desc.dyn_tree	=bl_tree;
		bl_desc.static_tree	=null;
		bl_desc.extra_bits	=extra_blbits;
		bl_desc.extra_base	=0;
		bl_desc.elems		=BL_CODES;
		bl_desc.max_length	=MAX_BL_BITS;
		bl_desc.max_code	=0;

		// Initialize the mapping length (0..255)-> length code (0..28)
		int length=0;
		for(code=0;code<LENGTH_CODES-1;code++){
			base_length[code]=length;
			for(n=0;n<(1<<extra_lbits[code]);n++)
				length_code[length++]=code;
		}
		// Assert (length==256,"ct_init: length!=256");

		/* Note that the length 255 (match length 258)can be represented
		*in two different ways: code 284+5 bits or code 285,so we
		*overwrite length_code[255] to use the best encoding:
		 */
		length_code[length-1]=code;

		/* Initialize the mapping dist (0..32K)-> dist code (0..29)*/
		dist=0;
		for(code=0;code<16;code++){
			base_dist[code]=dist;
			for(n=0;n<(1<<extra_dbits[code]);n++){
				dist_code[dist++]=code;
			}
		}
		// Assert (dist==256,"ct_init: dist!=256");
		dist>>=7;// from now on,all distances are divided by 128
		for( ;code<D_CODES;code++){
			base_dist[code]=dist<<7;
			for(n=0;n<(1<<(extra_dbits[code]-7));n++)
				dist_code[256+dist++]=code;
		}
		// Assert (dist==256,"ct_init: 256+dist!=512");

		// Construct the codes of the static literal tree
		for(bits=0;bits<=MAX_BITS;bits++)
			bl_count[bits]=0;
		n=0;
		while(n<=143){static_ltree[n++].dl=8;bl_count[8]++;}
		while(n<=255){static_ltree[n++].dl=9;bl_count[9]++;}
		while(n<=279){static_ltree[n++].dl=7;bl_count[7]++;}
		while(n<=287){static_ltree[n++].dl=8;bl_count[8]++;}
		/* Codes 286 and 287 do not exist,but we must include them in the
		*tree construction to get a canonical Huffman tree (longest code
		*all ones)
		 */
		gen_codes(static_ltree,L_CODES+1);

		/* The static distance tree is trivial: */
		for(n=0;n<D_CODES;n++){
			static_dtree[n].dl=5;
			static_dtree[n].fc=bi_reverse(n,5);
		}

		// Initialize the first block of the first file:
		init_block();
	}

	/* ==========================================================================
	*Initialize a new block.
	 */
	void init_block(){
		int n;// iterates over tree elements

		// Initialize the trees.
		for(n=0;n<L_CODES; n++)dyn_ltree[n].fc=0;
		for(n=0;n<D_CODES; n++)dyn_dtree[n].fc=0;
		for(n=0;n<BL_CODES;n++)bl_tree[n].fc=0;

		dyn_ltree[END_BLOCK].fc=1;
		opt_len=static_len=0;
		last_lit=last_dist=last_flags=0;
		flags=0;
		flag_bit=1;
	}

	/* ==========================================================================
	*Restore the heap property by moving down the tree starting at node k,
	*exchanging a node with the smallest of its two sons if necessary,stopping
	*when the heap property is re-established (each father smaller than its
	*two sons).
	 */
	void pqdownheap(
		DeflateCT[] tree,	// the tree to restore
		int k
	){	// node to move down
		int v=heap[k];
		int j=k<<1;	// left son of k

		while(j<=heap_len){
			// Set j to the smallest of the two sons:
			if(j<heap_len&&SMALLER(tree,heap[j+1],heap[j]))j++;

			// Exit if v is smaller than both sons
			if(SMALLER(tree,v,heap[j]))break;

			// Exchange v with the smallest son
			heap[k]=heap[j];
			k=j;

			// And continue down the tree,setting j to the left son of k
			j<<=1;
		}
		heap[k]=v;
	}

	/* ==========================================================================
	*Compute the optimal bit lengths for a tree and update the total bit length
	*for the current block.
	*IN assertion: the fields freq and dad are set,heap[heap_max] and
	*   above are the tree nodes sorted by increasing frequency.
	*OUT assertions: the field len is set to the optimal bit length,the
	*    array bl_count contains the frequencies for each bit length.
	*    The length opt_len is updated;static_len is also updated if stree is
	*    not null.
	 */
	void gen_bitlen(DeflateTreeDesc desc){ // the tree descriptor
		DeflateCT[] tree	=desc.dyn_tree;
		int[] extra			=desc.extra_bits;
		int @base			=desc.extra_base;
		int max_code		=desc.max_code;
		int max_length		=desc.max_length;
		DeflateCT[] stree	=desc.static_tree;
		int h;		// heap index
		int n,m;		// iterate over the tree elements
		int bits;		// bit length
		int xbits;		// extra bits
		int f;		// frequency
		int overflow=0;	// number of elements with bit length too large

		for(bits=0;bits<=MAX_BITS;bits++)bl_count[bits]=0;

		/* In a first pass,compute the optimal bit lengths (which may
		*overflow in the case of the bit length tree).
		 */
		tree[heap[heap_max]].dl=0;// root of the heap

		for(h=heap_max+1;h<HEAP_SIZE;h++){
			n=heap[h];
			bits=tree[tree[n].dl].dl+1;
			if(bits>max_length){
				bits=max_length;
				overflow++;
			}
			tree[n].dl=bits;
			// We overwrite tree[n].dl which is no longer needed

			if(n>max_code)continue;// not a leaf node

			bl_count[bits]++;
			xbits=0;
			if(n>=@base)xbits=extra[n-@base];
			f=tree[n].fc;
			opt_len+=f*(bits+xbits);
			if(stree!=null)static_len+=f*(stree[n].dl+xbits);
		}
		if(overflow==0)return;

		// This happens for example on obj2 and pic of the Calgary corpus

		// Find the first bit length which could increase:
		do{
			bits=max_length-1;
			while(bl_count[bits]==0)bits--;
			bl_count[bits]--;		// move one leaf down the tree
			bl_count[bits+1]+=2;	// move one overflow item as its brother
			bl_count[max_length]--;
			/* The brother of the overflow item also moves one step up,
			*but this does not affect bl_count[max_length]
			 */
			overflow-=2;
		}while(overflow>0);

		/* Now recompute all bit lengths,scanning in increasing frequency.
		*h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
		*lengths instead of fixing only the wrong ones. This idea is taken
		*from 'ar' written by Haruhiko Okumura.)
		 */
		for(bits=max_length;bits!=0;bits--){
			n=bl_count[bits];
			while(n!=0){
				m=heap[--h];
				if(m>max_code)continue;
				if(tree[m].dl!=bits){
					opt_len+=(bits-tree[m].dl)*tree[m].fc;
					tree[m].fc=bits;
				}
				n--;
			}
		}
	}

	  /* ==========================================================================
	  *Generate the codes for a given tree and bit counts (which need not be
	  *optimal).
	  *IN assertion: the array bl_count contains the bit length statistics for
	  *the given tree and the field len is set for all tree elements.
	  *OUT assertion: the field code is set for all tree elements of non
	  *    zero code length.
	   */
	void gen_codes(
		DeflateCT[] tree,	// the tree to decorate
		int max_code
	){	// largest code with non zero frequency
		int[] next_code=new int[MAX_BITS+1];// next code value for each bit length
		int code=0;		// running code value
		int bits;			// bit index
		int n;			// code index

		/* The distribution counts are first used to generate the code values
		*without bit reversal.
		 */
		for(bits=1;bits<=MAX_BITS;bits++){
			code=((code+bl_count[bits-1])<<1);
			next_code[bits]=code;
		}

		/* Check that the bit counts in bl_count are consistent. The last code
		*must be all ones.
		 */
	//    Assert (code+encoder->bl_count[MAX_BITS]-1==(1<<MAX_BITS)-1,
	//	    "inconsistent bit counts");
	//    Tracev((stderr,"\ngen_codes: max_code %d ",max_code));

		for(n=0;n<=max_code;n++){
			int len=tree[n].dl;
			if(len==0)continue;
			// Now reverse the bits
			tree[n].fc=bi_reverse(next_code[len]++,len);

	//      Tracec(tree!=static_ltree,(stderr,"\nn %3d %c l %2d c %4x (%x)",
	//	  n,(isgraph(n)?n:' '),len,tree[n].fc,next_code[len]-1));
		}
	}

	/* ==========================================================================
	*Construct one Huffman tree and assigns the code bit strings and lengths.
	*Update the total bit length for the current block.
	*IN assertion: the field freq is set for all tree elements.
	*OUT assertions: the fields len and code are set to the optimal bit length
	*    and corresponding code. The length opt_len is updated;static_len is
	*    also updated if stree is not null. The field max_code is set.
	 */
	void build_tree(DeflateTreeDesc desc){ // the tree descriptor
		DeflateCT[] tree	=desc.dyn_tree;
		DeflateCT[] stree	=desc.static_tree;
		int elems			=desc.elems;
		int n,m;		// iterate over heap elements
		int max_code=-1;	// largest code with non zero frequency
		int node=elems;	// next internal node of the tree

		/* Construct the initial heap,with least frequent element in
		*heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
		*heap[0] is not used.
		 */
		heap_len=0;
		heap_max=HEAP_SIZE;

		for(n=0;n<elems;n++){
			if(tree[n].fc!=0){
				heap[++heap_len]=max_code=n;
				depth[n]=0;
			}else{
				tree[n].dl=0;
			}
		}

		/* The pkzip format requires that at least one distance code exists,
		*and that at least one bit should be sent even if there is only one
		*possible code. So to avoid special checks later on we force at least
		*two codes of non zero frequency.
		 */
		while(heap_len<2){
			int xnew=heap[++heap_len]=(max_code<2?++max_code:0);
			tree[xnew].fc=1;
			depth[xnew]=0;
			opt_len--;
			if(stree!=null)static_len-=stree[xnew].dl;
			// new is 0 or 1 so it does not have extra bits
		}
		desc.max_code=max_code;

		/* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
		*establish sub-heaps of increasing lengths:
		 */
		for(n=heap_len>>1;n>=1;n--)pqdownheap(tree,n);

		/* Construct the Huffman tree by repeatedly combining the least two
		*frequent nodes.
		 */
		do{
			n=heap[SMALLEST];
			heap[SMALLEST]=heap[heap_len--];
			pqdownheap(tree,SMALLEST);

			m=heap[SMALLEST]; // m=node of next least frequency

			// keep the nodes sorted by frequency
			heap[--heap_max]=n;
			heap[--heap_max]=m;

			// Create a new node father of n and m
			tree[node].fc=tree[n].fc+tree[m].fc;
		//	depth[node]=(char)(MAX(depth[n],depth[m])+1);
			if(depth[n]>depth[m]+1){
				depth[node]=depth[n];
			}else{
				depth[node]=depth[m]+1;
			}
			tree[n].dl=tree[m].dl=node;

			// and insert the new node in the heap
			heap[SMALLEST]=node++;
			pqdownheap(tree,SMALLEST);

		}while(heap_len>=2);

		heap[--heap_max]=heap[SMALLEST];

		/* At this point,the fields freq and dad are set. We can now
		*generate the bit lengths.
		 */
		gen_bitlen(desc);

		// The field len is now set,we can generate the bit codes
		gen_codes(tree,max_code);
	}

	/* ==========================================================================
	*Scan a literal or distance tree to determine the frequencies of the codes
	*in the bit length tree. Updates opt_len to take into account the repeat
	*counts. (The contribution of the bit length codes will be added later
	*during the construction of bl_tree.)
	 */
	void scan_tree(
		DeflateCT[] tree,// the tree to be scanned
		int max_code
	){  // and its largest code of non zero frequency
		int n;			// iterates over all tree elements
		int prevlen=-1;		// last emitted length
		int curlen;			// length of current code
		int nextlen=tree[0].dl;	// length of next code
		int count=0;		// repeat count of the current code
		int max_count=7;		// max repeat count
		int min_count=4;		// min repeat count

		if(nextlen==0){
			max_count=138;
			min_count=3;
		}
		tree[max_code+1].dl=0xffff;// guard

		for(n=0;n<=max_code;n++){
			curlen=nextlen;
			nextlen=tree[n+1].dl;
			if(++count<max_count&&curlen==nextlen)
				continue;
			else if(count<min_count)
				bl_tree[curlen].fc+=count;
			else if(curlen!=0){
				if(curlen!=prevlen)
				bl_tree[curlen].fc++;
				bl_tree[REP_3_6].fc++;
			}else if(count<=10){
				bl_tree[REPZ_3_10].fc++;
			}else{
				bl_tree[REPZ_11_138].fc++;
			}
			count=0;prevlen=curlen;
			if(nextlen==0){
				max_count=138;
				min_count=3;
			}else if(curlen==nextlen){
				max_count=6;
				min_count=3;
			}else{
				max_count=7;
				min_count=4;
			}
		}
	}

	  /* ==========================================================================
	  *Send a literal or distance tree in compressed form,using the codes in
	  *bl_tree.
	   */
	void send_tree(
		DeflateCT[] tree,// the tree to be scanned
		int max_code
	){ // and its largest code of non zero frequency
		int n;			// iterates over all tree elements
		int prevlen=-1;		// last emitted length
		int curlen;			// length of current code
		int nextlen=tree[0].dl;	// length of next code
		int count=0;		// repeat count of the current code
		int max_count=7;		// max repeat count
		int min_count=4;		// min repeat count

		/* tree[max_code+1].dl=-1;*/  /* guard already set */
		if(nextlen==0){
			max_count=138;
			min_count=3;
		}

		for(n=0;n<=max_code;n++){
			curlen=nextlen;
			nextlen=tree[n+1].dl;
			if(++count<max_count&&curlen==nextlen){
				continue;
			}else if(count<min_count){
				do{ SEND_CODE(curlen,bl_tree);}while(--count!=0);
			}else if(curlen!=0){
				if(curlen!=prevlen){
					SEND_CODE(curlen,bl_tree);
					count--;
				}
				// Assert(count>=3&&count<=6," 3_6?");
				SEND_CODE(REP_3_6,bl_tree);
				send_bits(count-3,2);
			}else if(count<=10){
				SEND_CODE(REPZ_3_10,bl_tree);
				send_bits(count-3,3);
			}else{
				SEND_CODE(REPZ_11_138,bl_tree);
				send_bits(count-11,7);
			}
			count=0;
			prevlen=curlen;
			if(nextlen==0){
				max_count=138;
				min_count=3;
			}else if(curlen==nextlen){
				max_count=6;
				min_count=3;
			}else{
				max_count=7;
				min_count=4;
			}
		}
	}

	/* ==========================================================================
	*Construct the Huffman tree for the bit lengths and return the index in
	*bl_order of the last bit length code to send.
	 */
	int build_bl_tree(){
		int max_blindex; // index of last bit length code of non zero freq

		// Determine the bit length frequencies for literal and distance trees
		scan_tree(dyn_ltree,l_desc.max_code);
		scan_tree(dyn_dtree,d_desc.max_code);

		// Build the bit length tree:
		build_tree(bl_desc);
		/* opt_len now includes the length of the tree representations,except
		*the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
		 */

		/* Determine the number of bit length codes to send. The pkzip format
		*requires that at least 4 bit length codes be sent. (appnote.txt says
		*3 but the actual value used is 4.)
		 */
		for(max_blindex=BL_CODES-1;max_blindex>=3;max_blindex--){
			if(bl_tree[bl_order[max_blindex]].dl!=0)break;
		}
		/* Update opt_len to include the bit length tree and counts */
		opt_len+=3*(max_blindex+1)+5+5+4;
	//    Tracev((stderr,"\ndyn trees: dyn %ld,stat %ld",
	//	    encoder->opt_len,encoder->static_len));

		return max_blindex;
	}

	/* ==========================================================================
	*Send the header for a block using dynamic Huffman trees: the counts,the
	*lengths of the bit length codes,the literal tree and the distance tree.
	*IN assertion: lcodes>=257,dcodes>=1,blcodes>=4.
	 */
	void send_all_trees(int lcodes,int dcodes,int blcodes){ // number of codes for each tree
	//    Assert (lcodes>=257&&dcodes>=1&&blcodes>=4,"not enough codes");
	//    Assert (lcodes<=L_CODES&&dcodes<=D_CODES&&blcodes<=BL_CODES,
	//	    "too many codes");
	//    Tracev((stderr,"\nbl counts: "));
		send_bits(lcodes-257,5);// not +255 as stated in appnote.txt
		send_bits(dcodes-1,  5);
		send_bits(blcodes-4, 4);// not -3 as stated in appnote.txt
		for(int rank=0;rank<blcodes;rank++){
	//      Tracev((stderr,"\nbl code %2d ",bl_order[rank]));
			send_bits(bl_tree[bl_order[rank]].dl,3);
		}

		// send the literal tree
		send_tree(dyn_ltree,lcodes-1);

		// send the distance tree
		send_tree(dyn_dtree,dcodes-1);
	}

	/* ==========================================================================
	*Determine the best encoding for the current block: dynamic trees,static
	*trees or store,and output the encoded block to the zip file.
	 */
	void flush_block(int eof){ // true if this is the last block for a file
		int opt_lenb,static_lenb;// opt_len and static_len in bytes
		int max_blindex;	// index of last bit length code of non zero freq
		int stored_len;	// length of input block

		stored_len=strstart-block_start;
		flag_buf[last_flags]=flags;// Save the flags for the last 8 items

		// Construct the literal and distance trees
		build_tree(l_desc);
	//    Tracev((stderr,"\nlit data: dyn %ld,stat %ld",
	//	    encoder->opt_len,encoder->static_len));

		build_tree(d_desc);
	//    Tracev((stderr,"\ndist data: dyn %ld,stat %ld",
	//	    encoder->opt_len,encoder->static_len));
		/* At this point,opt_len and static_len are the total bit lengths of
		*the compressed block data,excluding the tree representations.
		 */

		/* Build the bit length tree for the above two trees,and get the index
		*in bl_order of the last bit length code to send.
		 */
		max_blindex=build_bl_tree();

		// Determine the best encoding. Compute first the block length in bytes
		opt_lenb	=(opt_len   +3+7)>>3;
		static_lenb=(static_len+3+7)>>3;

	//    Trace((stderr,"\nopt %lu(%lu)stat %lu(%lu)stored %lu lit %u dist %u ",
	//	   opt_lenb,encoder->opt_len,
	//	   static_lenb,encoder->static_len,stored_len,
	//	   encoder->last_lit,encoder->last_dist));

		if(static_lenb<=opt_lenb)
			opt_lenb=static_lenb;
		if(stored_len+4<=opt_lenb // 4: two words for the lengths
		  &&block_start>=0){
			int i;

			/* The test buf!=NULL is only necessary if LIT_BUFSIZE>WSIZE.
			*Otherwise we can't have processed more than WSIZE input bytes since
			*the last block flush,because compression would have been
			*successful. If LIT_BUFSIZE<=WSIZE,it is never too late to
			*transform a block into a stored block.
			 */
			send_bits((STORED_BLOCK<<1)+eof,3); /* send block type */
			bi_windup();		 /* align on byte boundary */
			put_short((ushort)stored_len);
			put_short((ushort)~stored_len);

		  // copy block
	/*
		  p=&window[block_start];
		  for(i=0;i<stored_len;i++)
		put_byte(p[i]);
	*/
			for(i=0;i<stored_len;i++)
				put_byte(win[block_start+i]);

		}else if(static_lenb==opt_lenb){
			send_bits((STATIC_TREES<<1)+eof,3);
			compress_block(static_ltree,static_dtree);
		}else{
			send_bits((DYN_TREES<<1)+eof,3);
			send_all_trees(l_desc.max_code+1,
					   d_desc.max_code+1,
					   max_blindex+1);
			compress_block(dyn_ltree,dyn_dtree);
		}

		init_block();

		if(eof!=0)bi_windup();
	}

	/* ==========================================================================
	*Save the match info and tally the frequency counts. Return true if
	*the current block must be flushed.
	 */
	bool ct_tally(
		int dist,// distance of matched string
		int lc
	){ // match length-MIN_MATCH or unmatched char (if dist==0)
		l_buf[last_lit++]=lc;
		if(dist==0){
			// lc is the unmatched char
			dyn_ltree[lc].fc++;
		}else{
			// Here,lc is the match length-MIN_MATCH
			dist--;		    // dist=match distance-1
		//      Assert((ush)dist<(ush)MAX_DIST &&
		//	     (ush)lc<=(ush)(MAX_MATCH-MIN_MATCH)&&
		//	     (ush)D_CODE(dist)<(ush)D_CODES, "ct_tally: bad match");

			dyn_ltree[length_code[lc]+LITERALS+1].fc++;
			dyn_dtree[D_CODE(dist)].fc++;

			d_buf[last_dist++]=dist;
			flags|=flag_bit;
		}
		flag_bit<<=1;

		// Output the flags if they fill a byte
		if((last_lit&7)==0){
			flag_buf[last_flags++]=flags;
			flags=0;
			flag_bit=1;
		}
		// Try to guess if it is profitable to stop the current block here
		if(compr_level>2&&(last_lit&0xfff)==0){
			// Compute an upper bound for the compressed length
			int out_length=last_lit*8;
			int in_length=strstart-block_start;

			for(int dcode=0;dcode<D_CODES;dcode++){
				out_length+=dyn_dtree[dcode].fc*(5+extra_dbits[dcode]);
			}
			out_length >>=3;
		//      Trace((stderr,"\nlast_lit %u,last_dist %u,in %ld,out ~%ld(%ld%%)",
		//	     encoder->last_lit,encoder->last_dist,in_length,out_length,
		//	     100L-out_length*100L/in_length));
			if(last_dist<last_lit/2&&out_length<in_length/2)
				return true;
		}
		return (last_lit==LIT_BUFSIZE-1||last_dist==DIST_BUFSIZE);
		/* We avoid equality with LIT_BUFSIZE because of wraparound at 64K
		*on 16 bit machines and because stored blocks are restricted to
		*64K-1 bytes.
		 */
	}

	  /* ==========================================================================
	  *Send the block data compressed using the given Huffman trees
	   */
	void compress_block(
		DeflateCT[] ltree,	// literal tree
		DeflateCT[] dtree	// distance tree
	){
		int dist;		// distance of matched string
		int lc;		// match length or unmatched char (if dist==0)
		int lx=0;		// running index in l_buf
		int dx=0;		// running index in d_buf
		int fx=0;		// running index in flag_buf
		int flag=0;	// current flags
		int code;		// the code to send
		int extra;		// number of extra bits to send

		if(last_lit!=0)do{
			if((lx&7)==0)
				flag=flag_buf[fx++];
			lc=l_buf[lx++]&0xff;
			if((flag&1)==0){
				SEND_CODE(lc,ltree);/* send a literal byte */
		//	Tracecv(isgraph(lc),(stderr," '%c' ",lc));
			}else{
				// Here,lc is the match length-MIN_MATCH
				code=length_code[lc];
				SEND_CODE(code+LITERALS+1,ltree);// send the length code
				extra=extra_lbits[code];
				if(extra!=0){
					lc-=base_length[code];
					send_bits(lc,extra);// send the extra length bits
				}
				dist=d_buf[dx++];
				// Here,dist is the match distance-1
				code=D_CODE(dist);
		//	Assert (code<D_CODES,"bad d_code");

				SEND_CODE(code,dtree);	  // send the distance code
				extra=extra_dbits[code];
				if(extra!=0){
					dist-=base_dist[code];
					send_bits(dist,extra);  // send the extra distance bits
				}
			} // literal or match pair ?
			flag>>=1;
		}while(lx<last_lit);

		SEND_CODE(END_BLOCK,ltree);
	}

	/* ==========================================================================
	*Send a value on a given number of bits.
	*IN assertion: length<=16 and value fits in length bits.
	 */
	const int Buf_size=16;// bit size of bi_buf
	void send_bits(
		int value,	// value to send
		int length
	){	// number of bits
		/* If not enough room in bi_buf,use (valid)bits from bi_buf and
		*(16-bi_valid)bits from value,leaving (width-(16-bi_valid))
		*unused bits in value.
		 */
		if(bi_valid>Buf_size-length){
			bi_buf|=(value<<bi_valid);
			put_short((ushort)bi_buf);
			bi_buf=(value>>(Buf_size-bi_valid));
			bi_valid+=length-Buf_size;
		}else{
			bi_buf|=value<<bi_valid;
			bi_valid+=length;
		}
	}

	/* ==========================================================================
	*Reverse the first len bits of a code,using straightforward code (a faster
	*method would use a table)
	*IN assertion: 1<=len<=15
	 */
	int bi_reverse(
		int code,	// the value to invert
		int len
	){	// its bit length
		int res=0;
		do{
			res|=code&1;
			code >>=1;
			res<<=1;
		}while(--len>0);
		return res>>1;
	}

	/* ==========================================================================
	*Write out any remaining bits in an incomplete byte.
	 */
	void bi_windup(){
		if(bi_valid>8){
			put_short((ushort)bi_buf);
		}else if(bi_valid>0){
			put_byte((byte)bi_buf);
		}
		bi_buf=0;
		bi_valid=0;
	}

	void qoutbuf(){
		if(outcnt!=0){
			DeflateBuffer q=new_queue();
			if(qhead==null)
				qhead=qtail=q;
			else{
				qtail=qtail.next=q;
			}
			q.len=outcnt-outoff;
		//      System.arraycopy(outbuf,outoff,q.ptr,0,q.len);
			for(int i=0;i<q.len;i++)
				q.ptr[i]=outbuf[outoff+i];
			outcnt=outoff=0;
		}
	}

	byte[] ZipDeflate(byte[] str){
		return this.ZipDeflate(str,DEFAULT_LEVEL);
	}
	byte[] ZipDeflate(byte[] str,int level){
		int i,j;

		deflate_data=str;
		deflate_pos=0;
		deflate_start(level);

		byte[] buff=new byte[1024];
		Gen::List<byte> @out=new Gen::List<byte>();
		while((i=deflate_internal(buff,0,buff.Length))>0){
			for(j=0;j<i;j++)@out.Add(buff[j]);
		}
		deflate_data=null;// G.C.
		return @out.ToArray();
	}

	//**************************************************************************
  public static byte[] DeflateToByteArray(byte[] data,int level){
		return new Deflator().ZipDeflate(data,level);
  }
  public static byte[] DeflateToByteArray(string input,int level){
		byte[] data=System.Text.Encoding.UTF8.GetBytes(input);
    return DeflateToByteArray(data,level);
  }
	public static string DeflateToBase64String(string input,int level){
		byte[] data=System.Text.Encoding.UTF8.GetBytes(input);
		data=new Deflator().ZipDeflate(data,level);
		return System.Convert.ToBase64String(data);
	}
	public static string DeflateToJ85String(string input,int level){
		byte[] data=System.Text.Encoding.UTF8.GetBytes(input);
		data=new Deflator().ZipDeflate(data,level);
		return ToEncode85String(data);
	}

  // 独自の85文字符号化。
  // 文字(0x40-0x7D 但し 0x52 を除く)と数字(0-84)の対応は以下で与えられる。
  //   i85=c-'\x28';if(i85==85)i85=52;
  public static string ToEncode85String(byte[] arr){
    System.Text.StringBuilder b=new System.Text.StringBuilder();
    uint v=0;
    for(int i=0;i<arr.Length;i++){
      if(i%4==0){
        v=0;
        for(int j=i+3;j>=i;j--)
          v=(uint)(v*256+(j<arr.Length?arr[j]:0));
        b.Append(ToEncode85String_char(v));v/=85;
      }
      b.Append(ToEncode85String_char(v));v/=85;
    }
    return b.ToString();
  }
  private static char ToEncode85String_char(uint v){
    v%=85;
    if(v==52)v=85;
    return (char)(v+40);
  }

  static uint[] crc_table=null;
  public static uint CalculateCrc32(byte[] data){
    if(crc_table==null){
      crc_table=new uint[256];
      for(uint i=0;i<256;i++){
        uint c=i;
        for(int j=0;j<8;j++)
          c=(uint)((c&1)!=0?0xEDB88320^c>>1:c>>1);
        crc_table[(int)i]=c;
      }
    }

    {
      uint c=0xFFFFFFFFu;
      for(uint i=0;i<data.Length;i++)
        c=crc_table[(c^data[i])&0xFF]^c>>8;
      return c^0xFFFFFFFFu;
    }
  }
}
/*
[afh.Tester.TestTarget]
public static class TestJsDeflate{
	public static void testDeflateString(afh.Application.Log log){
		string input="感じの混じった文章\n仮名漢字交じり";
		log.DumpString(input);
		string compressed=Deflator.DeflateToBase64String(input,9);

		// 行分割
		System.Text.StringBuilder b=new System.Text.StringBuilder();
		const int C_WIDTH=128;
		for(int i=0;i<compressed.Length;i+=C_WIDTH){
			b.Append('\'');
			b.Append(compressed,i,System.Math.Min(C_WIDTH,compressed.Length-i));
			b.Append("'\r\n");
		}

		log.DumpString(b.ToString());
	}
}
//*/
