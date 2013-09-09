importScripts("JRay.js");

var s, renderx, rendery;

self.addEventListener('message', function(e) {
	s = e.data;
	vp = s.vp;
	pp = s.pp;
	originx = vp.x;
	originy = vp.y;
	cz = pp.z;
	startx = s.px1;
	starty = s.py1;
	boxw = s.px2 - s.px1;
	boxh = s.py2 - s.py1;
	wunits = Math.ceil(boxw/s.pix);
	hunits = Math.ceil(boxh/s.pix);
	self.postMessage({
		t : 'su',
		w : 1 / wunits,
		h : 1 / hunits,
		xunits : wunits,
		yunits : hunits
	});
	renderx = 0, rendery = 0;
	var aa = JRay.AntiAlias._aa[s.aa];
	for(i in s.o) {
		//self.postMessage([s.o[i]]);
	}
	for(var j=0;j<boxh;j+=s.pix) {
		for(var i=0;i<boxw;i+=s.pix) {
			cx = originx + startx + i;
			cy = originy + starty + j;
			if (s.aa == JRay.AntiAlias.Noise) {
				tclr = shootRay(new JRay.ray(vp,new JRay.vector(cx-vp.x,cy-vp.y,cz-vp.z)),true);
				blura = tclr[1]/300;
				clr = [tclr[0]];
				for(var _i=0;_i<10;i++) {
					bluramm = blura*(0.5+Math.random(0.8));
					ang = Math.random()*2*Math.PI;
					clr.push(shootRay(new JRay.ray(vp,new JRay.vector(cx+Math.cos(ang)*bluramm-vp.x,
																	  cy+Math.sin(ang)*bluramm-vp.y,cz-vp.z))));
				}
			} else {
				clr = [shootRay(new JRay.ray(vp,new JRay.vector(cx-vp.x,cy-vp.y,cz-vp.z)))];
				for(_i in aa) {
					clr.push(shootRay(new JRay.ray(vp,new JRay.vector(cx+aa[_i][0]-vp.x,cy+aa[_i][1]-vp.y,cz-vp.z))));
				}
				clr = JRay.mixMultColors(clr);
			}
			self.postMessage({
				t : 'r',
				x : renderx,
				y : rendery,
				c : JRay.colorToStr(clr)
			});
			renderx++;
		}
		rendery++;
		renderx = 0;
	}
	self.postMessage({
		t : 'f'
	});
}, false);

function shootLightRay(r,l) {
	var lts = [];
	for(i in s.o) {
		var o = s.o[i];
		var m = o.mesh;
		var ltr = JRay._t[o.tt](o,r);
		for(j in ltr) {
			if (ltr[j][0] < 0.000001) continue;
			if (ltr[j][0] > 1) continue;
			lts.push({
				t : ltr[j][0],
				m : m,
				o : o
			});
		}
	}
	lts.sort(function(a,b){return a.t-b.t;});
	var ldist = JRay.v.mag(r.v);
	var remains = 1;
	var clclr = new JRay.color(255,255,255);
	for(i in lts) {
		if (remains == 0) break;
		var mesh = lts[i].m;
		if (mesh.type == JRay.Mesh.SOLID) {
			clclr = new JRay.lum(0,0,0);
			remains = 0;
		} else if (mesh.type == JRay.Mesh.TRANSPARENT) {
			var lessrrem = remains * (1-mesh.alpha);
			remains -= lessrrem;
			clclr = JRay.mixColors(clclr,JRay.Mesh.ColorDef[mesh.colormesh](r.getPoint(lts[i].t),lts[i].o,mesh),1-remains,lessrrem);
		}
	}
	return JRay.colorToLum(clclr,500/ldist*l);
	
}

function shootRay(r,isr,returnlength) {
	if (isr > 4) return new JRay.color(0,0,0);
	var ts = [];
	for(i in s.o) {
		var o = s.o[i];
		var m = o.mesh;
		var tr = JRay._t[o.tt](o,r);
		for(var j=0;j<tr.length;j++) {
			if (tr[j][0] < 0) continue;
			if (isr && tr[j][0] < 0.000001) continue;
			var hitp = r.getPoint(tr[j][0]);
			var curlum;
			for(var k=0;k<s.l.length;k++) {
				var lr;
				if (m.type == JRay.Mesh.SOLID && m.reflect == 0) {
					var slr = new JRay.ray(hitp,JRay.v.subtract(s.l[k].p,hitp));
					var shade = JRay.v.dotproduct(tr[j][1],slr.v)/JRay.v.mag(tr[j][1])/JRay.v.mag(slr.v);
					if (shade<0) shade = 0;
					lr = shootLightRay(slr,s.l[k].l*(0.3+0.8*shade));
				} else {
					lr = shootLightRay(new JRay.ray(hitp,JRay.v.subtract(s.l[k].p,hitp)),s.l[k].l);
				}
				if (k == 0) curlum = lr;
				else curlum = curlum.fuse(lr);
			}
			ts.push({
				t : tr[j][0],
				n : tr[j][1],
				hp : hitp,
				m : m,
				l : curlum,
				o : o
			});
		}
	}
	ts.sort(function(a,b){return a.t-b.t;});
	var firsttlength = null;
	var curclr = new JRay.color(0,0,0);
	var rrem = 1;
	for(i in ts) {
		if (rrem <= 0) break;
		var t = ts[i];
		if (firsttlength == null) firsttlength = r.tLength(t);
		var clr = JRay.Mesh.ColorDef[t.m.colormesh](t.hp,t.o,t.m);
		if (t.m.reflect > 0) {
			var nv = t.n;
			var reflectray = new JRay.ray(t.hp, JRay.v.subtract(r.v, JRay.v.mult(nv,2*JRay.v.dotproduct(r.v,nv)/JRay.v.dotproduct(nv,nv))));
			var rclr = shootRay(reflectray,isNaN(isr)?1:(isr+1));
			clr = JRay.mixColors(clr,rclr,1-t.m.reflect,t.m.reflect);
		}
		clr = t.l.onColor(JRay.mixColors(t.l,clr,0.05,0.95));
		if (rrem == 1) {
			curclr = clr;
			if (t.m.type == JRay.Mesh.SOLID) {
				rrem = 0;
			} else if (t.m.type == JRay.Mesh.TRANSPARENT) {
				rrem -= t.m.alpha;
			}
		} else {
			if (t.m.type == JRay.Mesh.SOLID) {
				curclr = JRay.mixColors(curclr,clr,1-rrem,rrem);
				rrem = 0;
			} else if (t.m.type == JRay.Mesh.TRANSPARENT) {
				var lessrrem = rrem * t.m.alpha;
				rrem -= lessrrem;
				curclr = JRay.mixColors(curclr,clr,1-rrem,lessrrem);
			}
		}
	}
	if (rrem > 0) {
		curclr = JRay.mixColors(curclr,new JRay.color(0,0,0),1-rrem,rrem);
	}
	if (returnlength) {
		return [curclr,firsttlength];
	}
	return curclr;
	
	
}



















