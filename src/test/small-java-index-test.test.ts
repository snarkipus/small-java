import { AstNode, AstNodeDescription, EmptyFileSystem, LangiumDocument, Reference } from "langium";
import { parseDocument } from "langium/test";
import { SJMethod, SJProgram, SJReturn } from "../language-server/generated/ast";
import { createSmallJavaServices } from "../language-server/small-java-module";

describe('Small Java Index: Qualified Names', async () => {
    
    const services = createSmallJavaServices(EmptyFileSystem).SmallJava;

    let testDoc : LangiumDocument<AstNode>;
    let exports : AstNodeDescription[];
    let computedNames : string;

    beforeAll(async () => {
        const text=`
        class C {
                A f;
                A m(A p) {
                    A v = null;
                    return null;
                }
            }
        class A {}
        `;

        testDoc = await parseDocument(services, text);
        exports = await services.references.ScopeComputation.computeExports(testDoc);
        computedNames = exports.map(e => e.name).join(', ');
    });

    it('Exports Qualified Names', () => {
        expect(computedNames).toBe('C, C.f, C.m, C.m.p, C.m.v, A');
    });
});

// this should break once scoping is updated from the default implementation
describe('Default Scope Provider', () => {

    const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
    let testDoc : LangiumDocument<AstNode>;
    let text : string;
    let refNode: AstNode;

    beforeAll(async () => {
        text=`
        class C {
                A f;
                A m(A p) {
                    A v = null;
                    return null;
                }
            }
        class A {}
        `;

        testDoc = await parseDocument(services, text);
        refNode = (((testDoc.parseResult.value as SJProgram)
                        .classes[0]
                        .members[1] as SJMethod)
                        .body
                        .statements[1] as SJReturn)
                        .expression;
    });

    it.skip('case 1: SJMemberSelection:member -> f, m, C.f, C.m', () => {
        const context = {
            $type: 'SJMemberSelection',
            $container: refNode.$container,
            $containerProperty: 'member'
        };
        
        const refInfo = {
            reference: {} as Reference,
            container: context,
            property: context.$containerProperty
        };

        let scope = services.references.ScopeProvider.getScope(refInfo);
        const computedScope = scope.getAllElements().map(e => e.name).join(', ');//?
        expect(computedScope).toBe('f, m, C.f, C.m');
    });

    it.skip('case 2: SJSymbolRef:symbol -> v, p, C.m.p, C.m.v', () => {
        const context = {
            $type: 'SJSymbolRef',
            $container: refNode.$container,
            $containerProperty: 'symbol'
        };
        
        const refInfo = {
            reference: {} as Reference,
            container: context,
            property: context.$containerProperty
        };

        let scope = services.references.ScopeProvider.getScope(refInfo);
        const computedScope = scope.getAllElements().map(e => e.name).join(', ');//?
        expect(computedScope).toBe('v, p, C.m.p, C.m.v');
    });
})
