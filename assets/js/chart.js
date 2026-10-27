// Hover and focus tooltip for the bar chart. Values are also printed at each bar
// tip and in the table below the chart, so the tooltip only adds a second line.
for (const plot of document.querySelectorAll(".plot")) {
  const tip = document.createElement("div");
  tip.className = "tip side";
  tip.hidden = true;
  tip.setAttribute("aria-hidden", "true");
  const value = tip.appendChild(document.createElement("strong"));
  const label = tip.appendChild(document.createElement("span"));
  plot.appendChild(tip);

  // Beside the bar, centred on its own row, so it never covers the row above.
  // After the printed value if it fits, otherwise over the end of the bar itself.
  // It never reaches into the label column; on narrow screens its text wraps instead.
  const show = (track) => {
    value.textContent = track.dataset.value;
    label.textContent = track.dataset.label;
    tip.hidden = false;
    const box = plot.getBoundingClientRect();
    const start = track.getBoundingClientRect().left - box.left;
    tip.style.maxWidth = `${box.width - start}px`;
    tip.style.left = `${start}px`; // measure from a known spot; the last position can squeeze it
    const bar = track.querySelector(".bar").getBoundingClientRect();
    const val = track.querySelector(".val").getBoundingClientRect();
    let left = val.right - box.left + 8;
    if (left + tip.offsetWidth > box.width) left = bar.right - box.left - 8 - tip.offsetWidth;
    tip.style.left = `${Math.max(start, left)}px`;
    tip.style.top = `${bar.top - box.top + bar.height / 2}px`;
  };
  const hide = () => { tip.hidden = true; };

  for (const track of plot.querySelectorAll(".track")) {
    track.addEventListener("pointerenter", () => show(track));
    track.addEventListener("pointerleave", hide);
    track.addEventListener("focus", () => show(track));
    track.addEventListener("blur", hide);
  }
}
