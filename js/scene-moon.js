/* ============================================================
   NachoFesta — 3D Moon headquarters (Three.js)
   Renders into <canvas data-moon-scene>. Craters are painted
   into a <canvas> texture at runtime, so nothing is fetched.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.querySelector('[data-moon-scene]');
  if (!canvas || typeof THREE === 'undefined') return;

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (err) {
    canvas.style.display = 'none';
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);
  camera.position.set(0, 0.4, 8.1);

  var moonGroup = new THREE.Group();
  scene.add(moonGroup);

  /* ---------- Painted lunar surface ---------- */
  function makeMoonMaps() {
    var W = 1024, H = 512;
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');

    // base regolith grey
    ctx.fillStyle = '#9a958d';
    ctx.fillRect(0, 0, W, H);

    // large dark maria ("seas")
    for (var m = 0; m < 9; m++) {
      var mx = Math.random() * W, my = 60 + Math.random() * (H - 120);
      var mr = 45 + Math.random() * 110;
      var g = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
      g.addColorStop(0, 'rgba(88, 85, 80, 0.55)');
      g.addColorStop(1, 'rgba(88, 85, 80, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    // craters: dark bowl + bright sunlit rim
    for (var i = 0; i < 260; i++) {
      var x = Math.random() * W, y = Math.random() * H;
      var r = 2 + Math.pow(Math.random(), 2.4) * 34;

      var bowl = ctx.createRadialGradient(x, y, 0, x, y, r);
      bowl.addColorStop(0, 'rgba(70, 67, 62, 0.6)');
      bowl.addColorStop(0.72, 'rgba(120, 116, 109, 0.35)');
      bowl.addColorStop(1, 'rgba(120, 116, 109, 0)');
      ctx.fillStyle = bowl;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = 'rgba(226, 222, 212, 0.26)';
      ctx.lineWidth = Math.max(1, r * 0.11);
      ctx.beginPath(); ctx.arc(x, y, r * 0.94, 0, Math.PI * 2); ctx.stroke();
    }

    // fine dust speckle
    for (var s = 0; s < 5000; s++) {
      ctx.fillStyle = Math.random() > 0.5
        ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
    }

    var map = new THREE.CanvasTexture(c);

    // bump map: greyscale copy is enough to catch the light
    var bump = new THREE.CanvasTexture(c);

    return { map: map, bump: bump };
  }

  var maps = makeMoonMaps();
  var moon = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 72, 72),
    new THREE.MeshStandardMaterial({
      map: maps.map,
      bumpMap: maps.bump,
      bumpScale: 0.05,
      roughness: 0.96,
      metalness: 0.0
    })
  );
  moonGroup.add(moon);

  /* ---------- Soft halo around the moon ---------- */
  var halo = new THREE.Mesh(
    new THREE.SphereGeometry(2.72, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0xf5a623,
      transparent: true,
      opacity: 0.055,
      side: THREE.BackSide
    })
  );
  moonGroup.add(halo);

  /* ---------- HQ marker pinned to the surface ---------- */
  var marker = new THREE.Group();
  var pinLat = 0.28, pinLon = -0.5;                       // roughly front-facing
  var pinR = 2.5;
  marker.position.set(
    pinR * Math.cos(pinLat) * Math.sin(pinLon),
    pinR * Math.sin(pinLat),
    pinR * Math.cos(pinLat) * Math.cos(pinLon)
  );
  marker.lookAt(0, 0, 0);

  var dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      emissive: 0xff8a1f,
      emissiveIntensity: 1.1,
      roughness: 0.3,
      transparent: true,
      opacity: 0.92
    })
  );
  dome.rotation.x = -Math.PI / 2;                          // open side against the surface
  marker.add(dome);

  var beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffc861 })
  );
  beacon.position.z = 0.34;
  marker.add(beacon);

  var beam = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 0.9, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xf5a623, transparent: true, opacity: 0.16,
      side: THREE.DoubleSide, depthWrite: false
    })
  );
  beam.position.z = 0.62;
  beam.rotation.x = Math.PI / 2;
  marker.add(beam);

  moonGroup.add(marker);

  /* ---------- Starfield ---------- */
  var starCount = 1800;
  var starPos = new Float32Array(starCount * 3);
  for (var i = 0; i < starCount; i++) {
    // scatter on a large shell so stars sit behind the moon
    var theta = Math.random() * Math.PI * 2;
    var phi = Math.acos(2 * Math.random() - 1);
    var rad = 60 + Math.random() * 60;
    starPos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = rad * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = rad * Math.cos(phi);
  }
  var starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  var stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.42, sizeAttenuation: true,
    transparent: true, opacity: 0.85, depthWrite: false
  }));
  scene.add(stars);

  /* ---------- Lighting: one hard sun, deep space shadow ---------- */
  scene.add(new THREE.AmbientLight(0x2a3350, 0.5));

  var sun = new THREE.DirectionalLight(0xfff2dc, 1.75);
  sun.position.set(6, 3.5, 5);
  scene.add(sun);

  var earthGlow = new THREE.PointLight(0x4f7fd4, 0.9, 40);
  earthGlow.position.set(-7, 2, -4);
  scene.add(earthGlow);

  /* ---------- Pointer parallax ---------- */
  var pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  window.addEventListener('mousemove', function (e) {
    target.x = (e.clientX / window.innerWidth - 0.5) * 2;
    target.y = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ---------- Resize ---------- */
  function resize() {
    var w = canvas.clientWidth || canvas.parentElement.clientWidth;
    var h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(canvas);
  }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;

    var t = clock.getElapsedTime();

    if (!reduceMotion) {
      moonGroup.rotation.y = t * 0.055;
      stars.rotation.y = t * 0.004;
      beacon.scale.setScalar(1 + Math.sin(t * 3) * 0.28);
      beam.material.opacity = 0.11 + Math.abs(Math.sin(t * 1.6)) * 0.13;
    }

    pointer.x += (target.x - pointer.x) * 0.04;
    pointer.y += (target.y - pointer.y) * 0.04;
    camera.position.x = pointer.x * 1.1;
    camera.position.y = 0.4 - pointer.y * 0.8;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
})();
