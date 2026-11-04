type AcademicUnitNode = { id: string; parent_id: string | null; name: string };

export function getAcademicUnitPath(unitId: string, units: AcademicUnitNode[]) {
  const names: string[] = [];
  const visited = new Set<string>();
  let current = units.find((unit) => unit.id === unitId);

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    names.unshift(current.name);
    const parentId = current.parent_id;
    current = parentId ? units.find((unit) => unit.id === parentId) : undefined;
  }

  return names.join(" / ");
}
