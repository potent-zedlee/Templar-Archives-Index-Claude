import { Auth as FirebaseAuth } from 'firebase-admin/auth';
import { App } from 'firebase-admin/app';

export type Auth = FirebaseAuth;
export function getAuth(app?: App): FirebaseAuth;
