import { LocalStorageAdapter } from '../services/storage.adapter.js';
import { Repository } from '../services/repository.js';
import { AuthService } from '../services/auth.service.js';
import { DocumentService } from '../services/document.service.js';
import { AIService } from '../services/ai.service.js';

const output = document.getElementById('output');
const SUITE = { pass: 0, fail: 0 };

function log(msg, className) {
    const p = document.createElement('p');
    p.textContent = msg;
    if (className) p.className = className;
    output.appendChild(p);
}

function assert(condition, msg) {
    if (!condition) throw new Error(msg || 'Assertion failed');
}

function assertEqual(a, b, msg) {
    if (a !== b) throw new Error(msg || `Expected ${JSON.stringify(a)} to equal ${JSON.stringify(b)}`);
}

async function runSuite(name, fn) {
    const heading = document.createElement('h2');
    heading.textContent = name;
    output.appendChild(heading);
    try {
        await fn();
        log(`  ✓ ${name}`, 'pass');
        SUITE.pass++;
    } catch (e) {
        log(`  ✗ ${name}: ${e.message}`, 'fail');
        SUITE.fail++;
    }
}

function test(name, fn) {
    return { name, fn };
}

function start() {
    log('Lexora Test Suite', '');
    log(`Iniciado: ${new Date().toLocaleString()}\n`, '');

    const tests = [
        test('LocalStorageAdapter', async () => {
            const adapter = new LocalStorageAdapter();
            assertEqual(await adapter.get('nonexistent'), null, 'get nonexistent key');
            await adapter.set('test-key', { foo: 'bar' });
            assertEqual((await adapter.get('test-key')).foo, 'bar', 'set/get value');
            await adapter.delete('test-key');
            assertEqual(await adapter.get('test-key'), null, 'delete removes key');
        }),

        test('Repository', async () => {
            const adapter = new LocalStorageAdapter();
            const docRepo = new Repository(adapter, 'test.documents');
            await docRepo.init();
            assert(Array.isArray(await docRepo.get()), 'init creates array for documents key');

            const objRepo = new Repository(adapter, 'test.settings');
            await objRepo.init();
            const val = await objRepo.get();
            assert(typeof val === 'object' && !Array.isArray(val), 'init creates object for non-documents key');

            await docRepo.set([{ id: 1 }]);
            assertEqual((await docRepo.get()).length, 1, 'set/get array');
        }),

        test('AuthService login/register', async () => {
            const adapter = new LocalStorageAdapter();
            const repo = new Repository(adapter, 'test.auth');
            await repo.init();
            const auth = new AuthService(repo);

            assertEqual(await auth.isAuthenticated(), false, 'not authenticated initially');
            assertEqual(await auth.getCurrentUser(), null, 'no user initially');

            const session = await auth.login('a@b.com', 'pwd');
            assertEqual(session.user.email, 'a@b.com', 'login returns session with email');
            assertEqual(await auth.isAuthenticated(), true, 'authenticated after login');

            const user = await auth.getCurrentUser();
            assertEqual(user.email, 'a@b.com', 'getCurrentUser returns user after login');
        }),

        test('AuthService register + logout', async () => {
            const adapter = new LocalStorageAdapter();
            const repo = new Repository(adapter, 'test.auth2');
            await repo.init();
            const auth = new AuthService(repo);

            const session = await auth.register('Juan', 'j@b.com', 'pwd');
            assertEqual(session.user.name, 'Juan', 'register sets name');
            assertEqual(session.user.email, 'j@b.com', 'register sets email');

            await auth.logout();
            assertEqual(await auth.isAuthenticated(), false, 'not authenticated after logout');
            assertEqual(await auth.getCurrentUser(), null, 'no user after logout');
        }),

        test('DocumentService CRUD', async () => {
            const adapter = new LocalStorageAdapter();
            const repo = new Repository(adapter, 'test.docs');
            await repo.init();
            const svc = new DocumentService(repo);

            assertEqual((await svc.getAll()).length, 0, 'empty initially');

            const doc1 = await svc.create({ title: 'Doc A', type: 'blog', content: 'Hello' });
            assert(doc1.id, 'create returns doc with id');
            assertEqual(doc1.title, 'Doc A', 'create sets title');

            await svc.create({ title: 'Doc B', type: 'email', content: 'World' });
            assertEqual((await svc.getAll()).length, 2, 'getAll returns all docs');

            const found = await svc.getById(doc1.id);
            assertEqual(found.title, 'Doc A', 'getById finds doc');

            const updated = await svc.update(doc1.id, { title: 'Doc A Updated' });
            assertEqual(updated.title, 'Doc A Updated', 'update modifies title');

            await svc.delete(doc1.id);
            assertEqual(await svc.getById(doc1.id), undefined, 'delete removes doc');
            assertEqual((await svc.getAll()).length, 1, 'only one doc remains');

            const docs = await svc.getAll();
            assertEqual(docs[0].title, 'Doc B', 'docs sorted by createdAt desc');
        }),

        test('AIService generate + persist', async () => {
            const adapter = new LocalStorageAdapter();
            const settingsRepo = new Repository(adapter, 'test.settings2');
            await settingsRepo.init();
            const docRepo = new Repository(adapter, 'test.ai.docs');
            await docRepo.init();
            const docSvc = new DocumentService(docRepo);
            const ai = new AIService(settingsRepo, docSvc);

            const result = await ai.generate('Test prompt', 'profesional', 'blog');
            assert(result.id, 'generate returns doc with id');
            assertEqual(result.title, 'Test prompt', 'generate uses prompt as title');

            const all = await docSvc.getAll();
            assertEqual(all.length, 1, 'generate persists document');
            assertEqual(all[0].title, 'Test prompt', 'persisted doc has correct title');
        }),

        // SupabaseAdapter requires network + real credentials.
        // Test manually: open test-runner.html, then in console:
        //   const a = new SupabaseAdapter('https://proyecto.supabase.co', 'anon-key');
        //   await a.get('contentflow.auth');
    ];

    (async () => {
        for (const t of tests) {
            await runSuite(t.name, t.fn);
        }
        log(`\n${SUITE.pass} passed, ${SUITE.fail} failed`, SUITE.fail === 0 ? 'pass' : 'fail');
    })();
}

start();
