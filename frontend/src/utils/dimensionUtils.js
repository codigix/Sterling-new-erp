/**
 * Standardized utility for rendering material dimensions based on item group.
 * Ensures consistency across PO, GRN, Quality, and Production departments.
 */
export const renderDimensions = (item) => {
  if (!item) return "-";
  
  // Support both nested dimensions object and flattened fields
  const data = item.dimensions || item;
  const group = (data.item_group || item.item_group || data.itemGroup || "").toLowerCase();
  const parts = [];
  
  const val = (v) => {
    const n = parseFloat(v);
    return (n && n !== 0) ? parseFloat(n.toFixed(4)) : null;
  };

  // Helper to get value from either snake_case or camelCase
  const get = (snake, camel) => val(data[snake]) || val(data[camel]);

  if (group === "plate" || group === "plates") {
    if (get('length', 'length')) parts.push(`L:${get('length', 'length')}`);
    if (get('width', 'width')) parts.push(`W:${get('width', 'width')}`);
    if (get('thickness', 'thickness')) parts.push(`T:${get('thickness', 'thickness')}`);
  } else if (group === "round bar" || group === "rb") {
    if (get('diameter', 'diameter')) parts.push(`Dia:${get('diameter', 'diameter')}`);
    if (get('length', 'length')) parts.push(`L:${get('length', 'length')}`);
  } else if (group === "pipe") {
    if (get('outer_diameter', 'outerDiameter')) parts.push(`OD:${get('outer_diameter', 'outerDiameter')}`);
    if (get('thickness', 'thickness')) parts.push(`T:${get('thickness', 'thickness')}`);
    if (get('length', 'length')) parts.push(`L:${get('length', 'length')}`);
  } else if (group === "block") {
    if (get('length', 'length')) parts.push(`L:${get('length', 'length')}`);
    if (get('width', 'width')) parts.push(`W:${get('width', 'width')}`);
    if (get('height', 'height')) parts.push(`H:${get('height', 'height')}`);
  } else if (group.includes("square bar") || group === "square bar" || group === "sq bar" || group.includes("square tube") || group === "sq tube" || group.includes("square")) {
    const s1 = get('side1', 'side1') || get('side_s1', 'side_s1') || get('width', 'width') || get('side_s', 'side_s') || val(data.s);
    const s2 = get('side2', 'side2') || get('side_s2', 'side_s2') || get('height', 'height') || s1;
    if (s1) parts.push(`S1:${s1}`);
    if (s2 && s2 !== s1) parts.push(`S2:${s2}`);
    if (get('thickness', 'thickness')) parts.push(`T:${get('thickness', 'thickness')}`);
    if (get('length', 'length')) parts.push(`L:${get('length', 'length')}`);
  } else if (group.includes("rectangular bar") || group === "rec bar" || group.includes("rectangular tube") || group === "rec tube" || group.includes("rectangular") || group.includes("rect")) {
    if (get('width', 'width') || get('side1', 'side1')) parts.push(`W:${get('width', 'width') || get('side1', 'side1')}`);
    if (get('height', 'height') || get('side2', 'side2')) parts.push(`H:${get('height', 'height') || get('side2', 'side2')}`);
    if (get('thickness', 'thickness')) parts.push(`T:${get('thickness', 'thickness')}`);
    if (get('length', 'length')) parts.push(`L:${get('length', 'length')}`);
  } else if (group.includes("channel") || group.includes("beam") || group.includes("c-channel") || group.includes("i-beam")) {
    if (get('height', 'height') || get('side2', 'side2')) parts.push(`H:${get('height', 'height') || get('side2', 'side2')}`);
    if (get('width', 'width') || get('side1', 'side1')) parts.push(`W:${get('width', 'width') || get('side1', 'side1')}`);
    if (get('web_thickness', 'webThickness') || val(data.tw)) parts.push(`Tw:${get('web_thickness', 'webThickness') || val(data.tw)}`);
    if (get('flange_thickness', 'flangeThickness') || val(data.tf)) parts.push(`FT:${get('flange_thickness', 'flangeThickness') || val(data.tf)}`);
    if (get('length', 'length')) parts.push(`L:${get('length', 'length')}`);
  } else if (group.includes("angle")) {
    if (get('side1', 'side1') || get('width', 'width')) parts.push(`S1:${get('side1', 'side1') || get('width', 'width')}`);
    if (get('side2', 'side2') || get('height', 'height')) parts.push(`S2:${get('side2', 'side2') || get('height', 'height')}`);
    if (get('thickness', 'thickness')) parts.push(`T:${get('thickness', 'thickness')}`);
    if (get('length', 'length')) parts.push(`L:${get('length', 'length')}`);
  } else {
    // Fallback: list all typical non-zero dimensions
    const fields = [
      { key: 'length', alt: 'length', label: 'L' },
      { key: 'width', alt: 'width', label: 'W' },
      { key: 'thickness', alt: 'thickness', label: 'T' },
      { key: 'diameter', alt: 'diameter', label: 'Dia' },
      { key: 'outer_diameter', alt: 'outerDiameter', label: 'OD' },
      { key: 'height', alt: 'height', label: 'H' },
      { key: 'web_thickness', alt: 'webThickness', label: 'Tw' },
      { key: 'flange_thickness', alt: 'flangeThickness', label: 'FT' },
      { key: 'side1', alt: 'side1', label: 'S1' },
      { key: 'side2', alt: 'side2', label: 'S2' },
      { key: 'side_s', alt: 'side_s', label: 'S' },
      { key: 'side_s1', alt: 'side_s1', label: 'S1' },
      { key: 'side_s2', alt: 'side_s2', label: 'S2' }
    ];
    fields.forEach(f => {
      const value = get(f.key, f.alt) || val(data.s) || val(data.s1) || val(data.s2); // Broad fallback for specific one-letter fields
      // Optimization: use get directly for each field in loop
      const specificValue = get(f.key, f.alt) || (f.key === 'side_s' ? val(data.s) : (f.key === 'side_s1' ? val(data.s1) : (f.key === 'side_s2' ? val(data.s2) : null)));
      if (specificValue) parts.push(`${f.label}:${specificValue}`);
    });
  }

  return parts.length > 0 ? parts.join(" \u00d7 ") : "-";
};
