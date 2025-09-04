import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

const g: any = globalThis as any
if (!g.TextEncoder) g.TextEncoder = TextEncoder
if (!g.TextDecoder) g.TextDecoder = TextDecoder

const prev = (g.import && g.import.meta && g.import.meta.env) || {}
g.import = g.import ?? {}
g.import.meta = g.import.meta ?? {}
g.import.meta.env = {
    ...prev,
    VITE_DYNAMIC_ID: 'test-dynamic-id',
}
if (!(globalThis as any).import?.meta?.env) {
    const current = (globalThis as any).import ?? {};
    const currentMeta = current.meta ?? {};
    const currentEnv = currentMeta.env ?? {};

    (globalThis as any).import = {
        ...current,
        meta: {
            ...currentMeta,
            env: {
                VITE_DYNAMIC_ID: 'test-dynamic-id',
                ...currentEnv,
            },
        },
    }
}
