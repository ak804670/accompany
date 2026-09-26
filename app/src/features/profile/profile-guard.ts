let dirty = false;

export function setProfileDirty(value: boolean): void {
  dirty = value;
}

export function profileIsDirty(): boolean {
  return dirty;
}
