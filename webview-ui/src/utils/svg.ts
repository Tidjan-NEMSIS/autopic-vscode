export function recolorSvg(svg: string, color: string): string {
  return svg
    .replace(/#6c63ff/gi, color)
    .replace(/rgb\(108\s*,\s*99\s*,\s*255\)/gi, color)
    .replace(/#6366f1/gi, color)
    .replace(/#8b5cf6/gi, color);
}

export function darkAdaptSvg(svg: string): string {
  return svg
    .replace(/#2f2e41/gi, '#94A3B8')
    .replace(/#3f3d56/gi, '#CBD5E1')
    .replace(/#e2e8f0/gi, '#334155')
    .replace(/stroke:\s*#000000/gi, 'stroke: #F8FAFC')
    .replace(/stroke="#000000"/gi, 'stroke="#F8FAFC"')
    .replace(/fill="#000000"/gi, 'fill="#F8FAFC"')
    .replace(/fill="#ffffff"/gi, 'fill="#1E293B"');
}
