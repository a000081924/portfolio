// Image viewer for the large images. Links marked data-viewer open their image in a
// dialog over a blurred copy of the page instead of as a bare file: fitted to the screen
// first, then a click zooms to actual size at that point, and dragging or the arrow keys
// pan. Tab stays inside the dialog. Without JavaScript the link still opens the image.
// data-full names a sharper file to load; data-caption overrides the caption.
(() => {
  const links = document.querySelectorAll("a[data-viewer]");
  if (!links.length) return;

  const svg = (paths) => `<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    zoomIn: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4M11 8v6M8 11h6"/>'),
    zoomOut: svg('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4M8 11h6"/>'),
    close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  };

  function iconButton(icon, label) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "viewer-btn";
    button.innerHTML = icon;
    button.setAttribute("aria-label", label);
    button.title = label;
    return button;
  }

  const dialog = document.createElement("dialog");
  dialog.className = "viewer";
  dialog.setAttribute("aria-label", "Image viewer");
  const stage = dialog.appendChild(document.createElement("div"));
  stage.className = "viewer-stage";
  const img = stage.appendChild(document.createElement("img"));
  img.draggable = false;
  const caption = dialog.appendChild(document.createElement("p"));
  caption.className = "viewer-caption";
  const tools = dialog.appendChild(document.createElement("div"));
  tools.className = "viewer-tools";
  const zoomBtn = tools.appendChild(iconButton(ICONS.zoomIn, "Zoom in"));
  const closeBtn = tools.appendChild(iconButton(ICONS.close, "Close"));
  document.body.append(dialog);

  let actual = false;

  // Zoom only helps when the image is bigger than the space it is fitted into.
  const canZoom = () => img.naturalWidth > img.clientWidth + 1 || img.naturalHeight > img.clientHeight + 1;

  function setActual(on, x, y) {
    let fx = 0.5, fy = 0.5;
    if (on && x !== undefined) {
      const r = img.getBoundingClientRect();
      fx = (x - r.left) / r.width;
      fy = (y - r.top) / r.height;
    }
    actual = on;
    dialog.classList.toggle("zoomed", on);
    zoomBtn.innerHTML = on ? ICONS.zoomOut : ICONS.zoomIn;
    zoomBtn.title = on ? "Fit to screen" : "Zoom in";
    zoomBtn.setAttribute("aria-label", zoomBtn.title);
    if (on) {
      // Keep the clicked point under the pointer, or centre the image from the button.
      const s = stage.getBoundingClientRect();
      stage.scrollLeft = fx * img.naturalWidth - (x === undefined ? s.width / 2 : x - s.left);
      stage.scrollTop = fy * img.naturalHeight - (y === undefined ? s.height / 2 : y - s.top);
    }
  }

  function refresh() {
    const zoomable = actual || canZoom();
    if (!zoomable && document.activeElement === zoomBtn) closeBtn.focus();
    zoomBtn.hidden = !zoomable;
    stage.classList.toggle("can-zoom", zoomable);
  }

  function open(link) {
    const thumb = link.querySelector("img");
    const figcaption = link.closest("figure")?.querySelector("figcaption");
    caption.textContent = link.dataset.caption || figcaption?.textContent.trim() || thumb?.alt || "";
    caption.hidden = !caption.textContent;
    img.alt = thumb?.alt || link.textContent.trim();
    setActual(false);
    // Show the zoom button before opening so it takes the initial focus; refresh()
    // hides it again once the image has loaded if the image already fits.
    zoomBtn.hidden = false;
    img.src = link.dataset.full || link.href;
    dialog.showModal();
    if (img.complete) refresh();
  }

  img.addEventListener("load", refresh);
  window.addEventListener("resize", () => { if (dialog.open && !actual) refresh(); });

  for (const link of links) {
    link.addEventListener("click", (e) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return; // new tab still works
      e.preventDefault();
      open(link);
    });
  }

  zoomBtn.addEventListener("click", () => setActual(!actual));
  closeBtn.addEventListener("click", () => dialog.close());

  // Keep Tab inside the dialog, and let the arrow keys pan a zoomed image.
  const PAN = { ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80] };
  dialog.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      const buttons = [zoomBtn, closeBtn].filter((b) => !b.hidden);
      const i = buttons.indexOf(document.activeElement);
      e.preventDefault();
      buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
    } else if (actual && PAN[e.key]) {
      e.preventDefault();
      stage.scrollBy(...PAN[e.key]);
    }
  });
  dialog.addEventListener("close", () => img.removeAttribute("src"));

  // A press that barely moves is a click: zoom in or out, or close when it lands
  // outside the image. A press that moves while zoomed in pans the image.
  let press = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    press = { x: e.clientX, y: e.clientY, left: stage.scrollLeft, top: stage.scrollTop, onImg: e.target === img, moved: false };
    if (actual && e.pointerType === "mouse") stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!press) return;
    const dx = e.clientX - press.x, dy = e.clientY - press.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) press.moved = true;
    if (actual && press.moved && e.pointerType === "mouse") {
      stage.classList.add("dragging");
      stage.scrollLeft = press.left - dx;
      stage.scrollTop = press.top - dy;
    }
  });
  stage.addEventListener("pointerup", () => {
    if (!press) return;
    const { moved, onImg, x, y } = press;
    press = null;
    stage.classList.remove("dragging");
    if (moved) return;
    if (!onImg) {
      if (!actual) dialog.close();
    } else if (actual) {
      setActual(false);
    } else if (canZoom()) {
      setActual(true, x, y);
    }
  });
  stage.addEventListener("pointercancel", () => { press = null; stage.classList.remove("dragging"); });
})();
