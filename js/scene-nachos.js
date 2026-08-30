/* ============================================================
   NachoFesta — 3D floating tortilla chips (Three.js)
   Renders into any <canvas data-nacho-scene> on the page.
   Optional attributes:
     data-count="18"      how many chips
     data-opacity="1"     canvas opacity
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.querySelector('[data-nacho-scene]');
  if (!canvas || typeof THREE === 'undefined') return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  var CHIP_COUNT = parseInt(canvas.dataset.count || '16', 10);

  /* ---------- Renderer / scene / camera ---------- */
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (err) {
    canvas.style.display = 'none';           // no WebGL — the CSS gradient behind it still looks fine
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0d0b09, 0.028);

  var camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  camera.position.set(0, 0, 26);

  /* ---------- Corn-tortilla surface texture (generated, no file needed) ---------- */
  function makeChipTexture() {
    var c = document.createElement('canvas');
    c.width = c.height = 256;
    var ctx = c.getContext('2d');

    var grd = ctx.createLinearGradient(0, 0, 256, 256);
    grd.addColorStop(0, '#f3c261');
    grd.addColorStop(0.5, '#e0a13c');
    grd.addColorStop(1, '#c97f22');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 256, 256);

    // toasted flecks + corn grain
    for (var i = 0; i < 900; i++) {
      var x = Math.random() * 256, y = Math.random() * 256;
      var r = Math.random() * 2.4;
      var dark = Math.random() > 0.35;
      ctx.fillStyle = dark
        ? 'rgba(120, 66, 15, ' + (Math.random() * 0.35).toFixed(2) + ')'
        : 'rgba(255, 236, 186, ' + (Math.random() * 0.3).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // a few darker char blisters
    for (var j = 0; j < 14; j++) {
      ctx.fillStyle = 'rgba(96, 48, 8, 0.32)';
      ctx.beginPath();
      ctx.ellipse(Math.random() * 256, Math.random() * 256,
        6 + Math.random() * 12, 4 + Math.random() * 9, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }

    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /* ---------- Rounded-corner triangle -> extruded chip geometry ---------- */
  function makeChipGeometry() {
    var s = 1.7;
    // Equilateral-ish triangle: apex up, flat base
    var pts = [
      { x: 0,          y: s },
      { x: s * 0.92,   y: -s * 0.62 },
      { x: -s * 0.92,  y: -s * 0.62 }
    ];
    var round = 0.26;                              // corner radius, keeps edges straight

    var shape = new THREE.Shape();
    for (var i = 0; i < 3; i++) {
      var prev = pts[(i + 2) % 3];
      var cur = pts[i];
      var next = pts[(i + 1) % 3];

      // point on the incoming edge, `round` back from the corner
      var vIn = { x: cur.x - prev.x, y: cur.y - prev.y };
      var lIn = Math.hypot(vIn.x, vIn.y);
      var a = { x: cur.x - (vIn.x / lIn) * round, y: cur.y - (vIn.y / lIn) * round };

      // point on the outgoing edge, `round` forward from the corner
      var vOut = { x: next.x - cur.x, y: next.y - cur.y };
      var lOut = Math.hypot(vOut.x, vOut.y);
      var b = { x: cur.x + (vOut.x / lOut) * round, y: cur.y + (vOut.y / lOut) * round };

      if (i === 0) shape.moveTo(a.x, a.y); else shape.lineTo(a.x, a.y);
      shape.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
    }
    shape.closePath();

    var geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.07,
      bevelSegments: 2,
      curveSegments: 6
    });
    geo.center();
    return geo;
  }

  var chipGeo = makeChipGeometry();
  var chipTex = makeChipTexture();
  var chipMat = new THREE.MeshStandardMaterial({
    map: chipTex,
    color: 0xffe3ae,
    emissive: 0x3a2408,
    emissiveIntensity: 0.55,
    roughness: 0.58,
    metalness: 0.04,
    side: THREE.DoubleSide
  });

  /* ---------- Chips ---------- */
  var chips = [];
  for (var i = 0; i < CHIP_COUNT; i++) {
    var mesh = new THREE.Mesh(chipGeo, chipMat);

    var depth = -14 + Math.random() * 20;
    var spread = 13 + (26 - depth) * 0.22;
    mesh.position.set(
      (Math.random() - 0.5) * spread * 2,
      (Math.random() - 0.5) * 15,
      depth
    );
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    var scale = 0.55 + Math.random() * 0.85;
    mesh.scale.setScalar(scale);

    chips.push({
      mesh: mesh,
      spin: {
        x: (Math.random() - 0.5) * 0.006,
        y: (Math.random() - 0.5) * 0.008,
        z: (Math.random() - 0.5) * 0.005
      },
      driftSpeed: 0.28 + Math.random() * 0.5,
      driftAmp: 0.5 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      baseY: mesh.position.y
    });
    scene.add(mesh);
  }

  /* ---------- Salt / spice dust particles ---------- */
  var dustCount = 420;
  var dustPos = new Float32Array(dustCount * 3);
  for (var d = 0; d < dustCount; d++) {
    dustPos[d * 3] = (Math.random() - 0.5) * 62;
    dustPos[d * 3 + 1] = (Math.random() - 0.5) * 38;
    dustPos[d * 3 + 2] = -20 + Math.random() * 32;
  }
  var dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  var dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xf5a623,
    size: 0.14,
    transparent: true,
    opacity: 0.65,
    sizeAttenuation: true,
    depthWrite: false
  }));
  scene.add(dust);

  /* ---------- Lighting ---------- */
  scene.add(new THREE.AmbientLight(0xffd9a0, 0.55));

  var key = new THREE.DirectionalLight(0xffc861, 1.5);
  key.position.set(6, 9, 12);
  scene.add(key);

  var fill = new THREE.DirectionalLight(0xe0392b, 0.55);
  fill.position.set(-9, -4, 6);
  scene.add(fill);

  var rim = new THREE.PointLight(0xff8a1f, 2.2, 70);
  rim.position.set(0, 2, -14);
  scene.add(rim);

  /* ---------- Mouse parallax ---------- */
  var pointer = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
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

  /* ---------- Pause when off-screen ---------- */
  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
    }, { threshold: 0 }).observe(canvas);
  }

  /* ---------- Loop ---------- */
  var clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;

    var t = clock.getElapsedTime();

    pointer.x += (target.x - pointer.x) * 0.045;
    pointer.y += (target.y - pointer.y) * 0.045;

    chips.forEach(function (c) {
      c.mesh.rotation.x += c.spin.x;
      c.mesh.rotation.y += c.spin.y;
      c.mesh.rotation.z += c.spin.z;
      c.mesh.position.y = c.baseY + Math.sin(t * c.driftSpeed + c.phase) * c.driftAmp;
    });

    dust.rotation.y = t * 0.012;

    camera.position.x += (pointer.x * 3.4 - camera.position.x) * 0.05;
    camera.position.y += (-pointer.y * 2.2 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
})();
