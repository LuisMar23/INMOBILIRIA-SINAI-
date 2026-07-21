// // src/auth/decorators/permisos.decorator.ts
// import { SetMetadata } from '@nestjs/common';
// import { ACCION_KEY, AccionPermiso, MODULO_KEY } from '../permisos.guard';


// export const RequierePermiso = (modulo: string, accion: AccionPermiso) => {
//   return (target: any, key: string, descriptor: PropertyDescriptor) => {
//     SetMetadata(MODULO_KEY, modulo)(target, key, descriptor);
//     SetMetadata(ACCION_KEY, accion)(target, key, descriptor);
//     return descriptor;
//   };
// };