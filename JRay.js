var JRay = {
	Scene : function() {
		this.worker = new Worker('JRay-w.js');
		this.worker.addEventListener('message', function(e,l) {
			r = e.data;
			if (typeof r == "string") {
				console.log(r);
			} else if (!isNaN(r.length)) {
				console.log(r[0]);
			} else if (r.t == "su") {
				this.boxunitw = r.w;
				this.boxunith = r.h;
			} else if (r.t == "r") {
				this.onStep();
				this.g.fillStyle = r.c;
				xpos = r.x * this.boxunitw;
				ypos = r.y * this.boxunith;
				this.g.fillRect(this.rx+this.rw*xpos,this.ry+this.rh*ypos,
								Math.ceil(this.rw*this.boxunitw),
								Math.ceil(this.rh*this.boxunith));
			} else if (r.t == "f") {
				this.onFinish();
			}
		}, false);
		this.o = [];
		this.l = [];
		this.pix = 3;
		this.vp = new JRay.point(0,0,0);
		this.pp = new JRay.point(0,0,-300);
		this.px1 = -50;
		this.py1 = -50;
		this.px2 = 50;
		this.py2 = 50;
		this.aa = JRay.AntiAlias.NONE;
		this.setPerspective = function(p,x1,y1,x2,y2) {
			this.pp = p;
			this.px1 = x1;
			this.px2 = x2;
			this.py1 = y1;
			this.py2 = y2;
		}
		this.setAntiAlias = function(a) {
			this.aa = a;
		}
		this.setViewingPoint = function(p) {
			this.vp = p;
		}
		this.setPixelation = function(pix) {
			this.pix = pix;
		}
		this.render = function(ctx, set) {
			this.worker.g = ctx;
			if (set == null) {set = {x:0,y:0,w:300,h:300};}
			this.worker.rx = isNaN(set.x)?0:set.x;
			this.worker.ry = isNaN(set.y)?0:set.y;
			this.worker.rw = isNaN(set.w)?300:set.w;
			this.worker.rh = isNaN(set.h)?300:set.h;
			this.worker.onStep = JRay.isFunction(set.onStep)?set.onStep:(function(){});
			this.worker.onFinish = JRay.isFunction(set.onFinish)?set.onFinish:(function(){});
			this.worker.postMessage({
				pix : this.pix, vp : this.vp, pp : this.pp, px1 : this.px1, py1 : this.py1, px2 : this.px2, py2 : this.py2,
				o : this.o, l : this.l, aa : this.aa
			});
			return Math.ceil((this.px2-this.px1)/this.pix) * Math.ceil((this.py2-this.py1)/this.pix);
		}
		this.addObject = function(o,m) {
			var obj = [];
			if (o.tt == "array") {
				for(_i_ in o.obj) {
					obj.push(o.obj[_i_]);
				}
			} else {
				obj.push(o);
			}
			for(_i_ in obj) {
				this.o.push(obj[_i_]);
				this.o[this.o.length-1].mesh = {};
				for(_m_ in m) {
					if (JRay.isFunction(m[_m_])) continue;
					this.o[this.o.length-1].mesh[_m_] = m[_m_];
				}
				this.o[this.o.length-1].b = [];
				for(_b_ in obj[_i_].bound) {
					this.o[this.o.length-1].b.push(obj[_i_].bound[_b_]);
				}
			}
		}
		this.addLightSource = function(p,l) {
			this.l.push({p:p,l:l});
		}
		this.clearScene = function() {
			this.o = [];
			this.l = [];
		}
	},
	
	Bounds : {
		test : {
			box : function(d,p) {
				return p.x>=d.a.x&&p.x<=d.b.x&&p.y>=d.a.y&&p.y<=d.b.y&&p.z>=d.a.z&&p.z<=d.b.z;
			},
			ellipse : function(d,p) {
				return Math.sqrt(Math.pow((p[d.t1]-d.p1)/d.a,2)+Math.pow((p[d.t2]-d.p2)/d.b,2))<=1;
			}
		}
	},
	BoundingDef : function() {
		this.type = '';
		this.data = {
			ie : true
		};
		this.setTest = function(ie) {
			this.data.ie = ie;
		}
		this.setupBox = function(a,b,c,d,e,f) {
			this.type = 'box';
			if (arguments.length == 2) {
				this.data.a = a;
				this.data.b = b;
			} else {
				this.data.a = new JRay.point(a,b,c);
				this.data.b = new JRay.point(d,e,f);
			}
		}
		this.setupEllipse = function(t1,t2,p1,p2,a,b) {
			this.type = 'ellipse';
			this.data.t1 = t1;
			this.data.t2 = t2;
			this.data.p1 = p1;
			this.data.p2 = p2;
			this.data.a = a;
			this.data.b = b;
		}
	},
	
	Objects : {
		Sphere : function(c,r) {
			this.tt = 'sphere';
			this.bound = [];
			this.c = c;
			this.r = r;
		},
		Plane : function(A,B,C,D) {
			this.tt = 'plane';
			this.bound = [];
			if (arguments.length == 2) {
				this.n = A;
				this.d = B;
			} else {
				this.n = new JRay.vector(A,B,C);
				this.d = D;
			}
		},
		Box : function(x,y,z,xx,yy,zz) {
			this.tt = 'array';
			this.bound = [];
			this.obj = [];
			if (arguments.length == 2) {
				this.p = x;
				this.d = y;
			} else {
				this.p = new JRay.point(x,y,z);
				this.d = new JRay.point(xx,yy,zz);
			}
			var bddef = new JRay.BoundingDef();
			this.obj[0] = new JRay.Objects.Plane(1,0,0,-this.p.x);
			bddef.setupBox(this.p.x-1,this.p.y,this.p.z,this.p.x+1,this.p.y+this.d.y,this.p.z+this.d.z);
			this.obj[0].addBound(bddef);
			this.obj[1] = new JRay.Objects.Plane(1,0,0,-this.p.x-this.d.x);
			bddef.setupBox(this.p.x+this.d.x-1,this.p.y,this.p.z,this.p.x+this.d.x+1,this.p.y+this.d.y,this.p.z+this.d.z);
			this.obj[1].addBound(bddef);
			this.obj[2] = new JRay.Objects.Plane(0,1,0,-this.p.y);
			bddef.setupBox(this.p.x,this.p.y-1,this.p.z,this.p.x+this.d.x,this.p.y+1,this.p.z+this.d.z);
			this.obj[2].addBound(bddef);
			this.obj[3] = new JRay.Objects.Plane(0,1,0,-this.p.y-this.d.y);
			bddef.setupBox(this.p.x,this.p.y+this.d.y-1,this.p.z,this.p.x+this.d.x,this.p.y+this.d.y+1,this.p.z+this.d.z);
			this.obj[3].addBound(bddef);
			this.obj[4] = new JRay.Objects.Plane(0,0,1,-this.p.z);
			bddef.setupBox(this.p.x,this.p.y,this.p.z-1,this.p.x+this.d.x,this.p.y+this.d.y,this.p.z+1);
			this.obj[4].addBound(bddef);
			this.obj[5] = new JRay.Objects.Plane(0,0,1,-this.p.z-this.d.z);
			bddef.setupBox(this.p.x,this.p.y,this.p.z+this.d.z-1,this.p.x+this.d.x,this.p.y+this.d.y,this.p.z+this.d.z+1);
			this.obj[5].addBound(bddef);
		}
	},
	
	_t : {
		boundtest : function(ss,b,r) {
			if (b.length == 0) return ss;
			var rss = [];
			for(_ss in ss) {
				var isok = true;
				for(_b in b) {
					if (JRay.Bounds.test[b[_b].t](b[_b].d,r.getPoint(ss[_ss][0]))!=b[_b].d.ie) {
						isok = false;
						break;
					}
				}
				if (isok) rss.push(ss[_ss]);
			}
			return rss;
		},
		plane : function (obj,r) {
			var denom = JRay.v.dotproduct(r.v,obj.n);
			if (denom == 0) return [];
			var thet = -(obj.d+JRay.v.dotproduct(r.p,obj.n))/denom;
			if (thet < 0) return [];
			var solset = [[thet,obj.n]];
			return JRay._t.boundtest(solset,obj.b,r);
		},
		sphere : function(obj,r) {
			var eminusc = JRay.v.subtract(r.p,obj.c);
			var ddotd = JRay.v.dotproduct(r.v,r.v);
			var disc = Math.pow(JRay.v.dotproduct(r.v,eminusc),2)-ddotd*(JRay.v.dotproduct(eminusc,eminusc)-obj.r*obj.r);
			if (disc < 0) return [];
			disc = Math.sqrt(disc);
			var tlt = -JRay.v.dotproduct(r.v,eminusc);
			var sol = [(tlt+disc)/ddotd,(tlt-disc)/ddotd];
			var solset = [[sol[0],new JRay.v.subtract(r.getPoint(sol[0]),obj.c)],
						  [sol[1],new JRay.v.subtract(r.getPoint(sol[1]),obj.c)]];
			return JRay._t.boundtest(solset,obj.b,r);
			
		}
	},
	
	MeshDef : function() {
		this.type = JRay.Mesh.SOLID;
		this.alpha = 1;
		this.reflect = 0;
		this.refractionIndex = 1;
		this.color = new JRay.color(100,100,100);
		this.colormesh = JRay.Mesh.ColorDef.SOLID;
		this.colordata = {};
		this.applyColor = function(n) {
			this.colormesh = n[0];
			this.colordata = n[1];
		}
	},
	Mesh : {
		SOLID : 0,
		TRANSPARENT : 1,
		ColorDef : {
			SOLID : 0,
			0 : function(p,obj,mesh) {
				return mesh.color;
			},
			CHECKERED : 1,
			1 : function(p,obj,mesh) {
				cd = mesh.colordata;
				return ((Math.floor(p[cd.t1]/cd.sp1)+Math.floor(p[cd.t2]/cd.sp2))%2)?cd.c1:cd.c2;
			},
			IMAGE : 999,
			999 : function(p,obj,mesh) {
				cd = mesh.colordata;
				if (cd.ct == JRay.Mesh.Image.Cover.PLANAR) {
					return JRay.Image.imageDataPixel(cd.id,Math.floor(Math.abs(p[cd.t1]%cd.w)/cd.w*cd.idw),
														   Math.floor(Math.abs(p[cd.t2]%cd.h)/cd.h*cd.idh));
				} else if (cd.ct == JRay.Mesh.Image.Cover.SPHERICAL) {
					var vn = cd.vn, ve = cd.ve,
						vp = JRay.v.unit(JRay.v.subtract(p,obj.c)),
						phi = Math.acos(-JRay.v.dotproduct(vn,vp));
					var xcoord = (Math.acos(JRay.v.dotproduct(vp,ve)/Math.sin(phi)))/(2*Math.PI); 
					var pix1 = ((JRay.v.dotproduct(JRay.v.crossproduct(vn,ve),vp)>0)?xcoord:(1-xcoord));
					return JRay.Image.imageDataPixel(cd.id,Math.floor((pix1%cd.w)/cd.w*cd.idw),Math.floor(((phi/Math.PI)%cd.h)/cd.h*cd.idh));
				}
				return mesh.color;
			}
		},
		Color : {
			SOLID : function(c) {
				return [JRay.Mesh.ColorDef.SOLID,{}];
			},
			CHECKERED : function(c1,c2,t1,t2,sp1,sp2) {
				return [JRay.Mesh.ColorDef.CHECKERED,{
					c1 : c1,
					c2 : c2,
					t1 : t1,
					t2 : t2,
					sp1 : sp1,
					sp2 : sp2
				}];
			},
			IMAGE : function(data) {
				fromimage = JRay.Image.fromImage(data.image);
				var returnobj = {
					id : fromimage.id,
					idw : fromimage.w,
					idh : fromimage.h,
					ct : data.coverType
				};
				if (data.coverType == JRay.Mesh.Image.Cover.PLANAR) {
					returnobj.t1 = data.t1;
					returnobj.t2 = data.t2;
					returnobj.w = isNaN(data.width)?fromimage.w:data.width;
					returnobj.h = isNaN(data.height)?fromimage.h:data.height;
				} else if (data.coverType == JRay.Mesh.Image.Cover.SPHERICAL) {
					returnobj.vn = data.vectorNorth?data.vectorNorth:(new JRay.vector(0,1,0));
					returnobj.ve = data.vectorEquator?data.vectorEquator:(new JRay.vector(-1,0,0));
					returnobj.w = isNaN(data.width)?1:data.width;
					returnobj.h = isNaN(data.height)?1:data.height;
				}
				return [JRay.Mesh.ColorDef.IMAGE,returnobj];
			}
		},
		Image : {
			Cover : {
				PLANAR : 0,
				SPHERICAL : 1
			}
		}
	},
	
	AntiAlias : {
		NONE : 0,
		SuperSampling4 : 1,
		SuperSampling8 : 2,
		SuperSampling3 : 3,
		Noise : 999,
		_aa : {
			0 : [],
			1 : [[-1,-1],[-1,1],[1,1],[1,-1]],
			2 : [[-1,-1],[-1,1],[1,1],[1,-1],[1,0],[-1,0],[0,1],[0,-1]],
			3 : [[-1,0],[1,-1],[1,1]],
			999 : [[-1,-1],[-1,1],[1,1],[1,-1],[1,0],[-1,0],[0,1],[0,-1]]
		}
	},
	
	point : function(x,y,z) {
		return new JRay.vector(x,y,z);
	},
	vector : function(x,y,z) {
		this.x = x;
		this.y = y;
		this.z = z;
	},
	v : {
		subtract : function(v1,v2) {
			return new JRay.vector(v1.x-v2.x,v1.y-v2.y,v1.z-v2.z);
		},
		add : function(v1,v2) {
			return new JRay.vector(v1.x+v2.x,v1.y+v2.y,v1.z+v2.z);
		},
		dotproduct : function(v1,v2) {
			return v1.x*v2.x+v1.y*v2.y+v1.z*v2.z;
		},
		crossproduct : function(v1,v2) {
			return new JRay.vector(v1.y*v2.z-v1.z*v2.y,v1.z*v2.x-v1.x*v2.z,v1.x*v2.y-v1.y*v2.x);
		},
		mult : function(v,m) {
			return new JRay.vector(v.x*m,v.y*m,v.z*m);
		},
		mag : function(v) {
			return Math.sqrt(v.x*v.x+v.y*v.y+v.z*v.z);
		},
		unit : function(v) {
			return JRay.v.mult(v,1/JRay.v.mag(v));
		},
		vToStr : function(v) {
			return v.x+","+v.y+","+v.z;
		}
	},
	ray : function(p,v) {
		this.p = p;
		this.v = v;
		this.getPoint = function(t) {
			return JRay.v.add(this.p,JRay.v.mult(this.v,t));
		}
		this.tLength = function(t) {
			return JRay.v.mag(JRay.v.mult(this.v,t));
		};
	},
	color : function(r,g,b,a) {
		this.r = (r<0)?0:((r>255)?255:Math.round(r));
		this.g = (g<0)?0:((g>255)?255:Math.round(g));
		this.b = (b<0)?0:((b>255)?255:Math.round(b));
		this.a = isNaN(a)?1:a;
	},
	mixMultColors : function(c) {
		var cr=cg=cb=0;
		for(var i=0;i<c.length;i++) {
			cr += c[i].r;
			cg += c[i].g;
			cb += c[i].b;
		}
		return new JRay.color(cr/c.length,cg/c.length,cb/c.length);
	},
	mixColors : function(c1,c2,r1,r2) {
		return new JRay.color(c1.r*r1+c2.r*r2,c1.g*r1+c2.g*r2,c1.b*r1+c2.b*r2);
	},
	transColors : function(c1,c2,t) {
		return new JRay.color(c1.r+(c2.r-c1.r)*t,c1.g+(c2.g-c1.g)*t,c1.b+(c2.b-c1.b)*t);
	},
	colorToLum : function(c,l) {
		return new JRay.lum(c.r,c.g,c.b,l);
	},
	lum : function(r,g,b,l) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.l = l;
		this.fuse = function(l) {
			l1 = this.l;
			l2 = l.l;
			l1 /= (l1 + l2);
			l2 /= (l1 + l2);
			nr = this.r*l1 + l.r*l2;
			ng = this.g*l1 + l.g*l2;
			nb = this.b*l1 + l.b*l2;
			return new JRay.lum(nr,ng,nb,Math.sqrt(this.l*l.l)+Math.abs(this.l-l.l)/3);
		}
		this.onColor = function(c) {
			cr = this.l*c.r*(this.r/255+0.4);
			cg = this.l*c.g*(this.g/255+0.4);
			cb = this.l*c.b*(this.b/255+0.4);
			return new JRay.color(cr,cg,cb);
		}
	},
	colorToStr : function(c) {
		return "rgba("+c.r+","+c.g+","+c.b+","+c.a+")";
	},
	colorToStrR : function(c) {
		return "rgba("+Math.round(c.r)+","+Math.round(c.g)+","+Math.round(c.b)+","+c.a+")";
	},
	isFunction : function(functionToCheck) {
		var getType = {};
		return functionToCheck && getType.toString.call(functionToCheck) == '[object Function]';
	},
	DBP : function(x1,y1,x2,y2) {
		return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
	},
	
	Image : {
		fromImage : function(img) {
			var canvas = document.createElement('canvas');
			var context = canvas.getContext('2d');
			canvas.width  = img.width; canvas.height = img.height;
			context.drawImage(img, 0, 0, img.width, img.height);
			return {
				id : context.getImageData(0, 0, canvas.width, canvas.height),
				w : canvas.width,
				h : canvas.height
			};
		},
		imageDataPixel : function(id,x,y) {
			return new JRay.color(id.data[((y*(id.width*4))+(x*4))],
								  id.data[((y*(id.width*4))+(x*4))+1],
								  id.data[((y*(id.width*4))+(x*4))+2]);
		}
	}
};

for(_jo in JRay.Objects) {
	JRay.Objects[_jo].prototype.clearBounds = function() {
		if (this.tt == 'array') {
			for(_objs in this.obj) {
				this.obj[_objs].bound = [];
			}
		} else {
			this.bound = [];
		}
	}
	JRay.Objects[_jo].prototype.addBound = function(b) {
		if (this.tt == 'array') {
			for(_objs in this.obj) {
				this.obj[_objs].bound.push({
					t : b.type,
					d : {}
				});
				for(_bd in b.data) {
					this.obj[_objs].bound[this.obj[_objs].bound.length-1].d[_bd] = b.data[_bd];
				}
			}
		} else {
			this.bound.push({
				t : b.type,
				d : {}
			});
			for(_bd in b.data) {
				this.bound[this.bound.length-1].d[_bd] = b.data[_bd];
			}
		}
	}
}

