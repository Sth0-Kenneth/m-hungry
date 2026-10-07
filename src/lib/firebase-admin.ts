import "server-only";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { serverEnv } from "@/lib/server-env";

export function adminMessaging(){
 if(!serverEnv.FIREBASE_ADMIN_PROJECT_ID||!serverEnv.FIREBASE_ADMIN_CLIENT_EMAIL||!serverEnv.FIREBASE_ADMIN_PRIVATE_KEY)return null;
 const app=getApps()[0]??initializeApp({credential:cert({projectId:serverEnv.FIREBASE_ADMIN_PROJECT_ID,clientEmail:serverEnv.FIREBASE_ADMIN_CLIENT_EMAIL,privateKey:serverEnv.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g,"\n")})});
 return getMessaging(app);
}
