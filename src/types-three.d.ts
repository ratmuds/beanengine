// Minimal ambient module to quiet TS complaints if @types/three isn't present
declare module "three" {
  const anyThree: any;
  export = anyThree;
}
