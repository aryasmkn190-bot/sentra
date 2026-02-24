/// <reference path="../.astro/types.d.ts" />

interface AdminUserLocals {
    id: number;
    username: string;
    role: 'super_admin' | 'admin';
    allowedOffices: string[];
    name: string;
    ts: number;
}

declare namespace App {
    interface Locals {
        adminUser?: AdminUserLocals;
    }
}
