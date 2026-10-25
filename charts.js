/* Graphiques animés sans bibliothèque externe */
const Charts = {
  draw(cv, data, type) {
    const c = cv.getContext('2d');
    const W = cv.width = cv.clientWidth * 2;
    const H = cv.height = cv.clientHeight * 2;
    const muted = getComputedStyle(document.documentElement).getPropertyValue('--muted');
    const max = Math.max(1, ...data.map(d => d.v));
    const tot = data.reduce((a, d) => a + d.v, 0);
    let t0;

    const frame = ts => {
      t0 ??= ts;
      const p = Math.min(1, (ts - t0) / 900), e = 1 - Math.pow(1 - p, 3);
      c.clearRect(0, 0, W, H);
      c.textAlign = 'center';
      c.fillStyle = muted;
      c.font = '24px Inter, sans-serif';

      if (type === 'bar') {
        const w = W / data.length;
        data.forEach((d, i) => {
          const h = (H - 100) * d.v / max * e;
          c.fillStyle = d.c;
          c.beginPath(); c.roundRect(i * w + w * .2, H - 50 - h, w * .6, h, 12); c.fill();
          c.fillStyle = muted;
          c.fillText(d.l, i * w + w / 2, H - 14);
          c.fillText(d.v, i * w + w / 2, H - 62 - h);
        });
      } else {
        let a = -Math.PI / 2;
        const r = Math.min(W, H) / 2 - 16;
        data.forEach(d => {
          const s = tot ? d.v / tot * Math.PI * 2 * e : 0;
          c.beginPath();
          c.arc(W / 2, H / 2, r, a, a + s);
          c.arc(W / 2, H / 2, r * .6, a + s, a, true);
          c.closePath(); c.fillStyle = d.c; c.fill();
          a += s;
        });
        c.fillStyle = muted; c.font = 'bold 44px Inter, sans-serif';
        c.fillText(tot, W / 2, H / 2 + 14);
      }
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
};
