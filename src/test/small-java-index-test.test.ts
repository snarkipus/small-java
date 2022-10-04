import { AstNode, AstNodeDescription, EmptyFileSystem, LangiumDocument, Reference } from "langium";
import { parseDocument } from "langium/test";
import { SJMethod, SJProgram, SJReturn } from "../language-server/generated/ast";
import { createSmallJavaServices } from "../language-server/small-java-module";

describe('Small Java Index: Qualified Names', async () => {
    
    const services = createSmallJavaServices(EmptyFileSystem).SmallJava;

    let testDoc : LangiumDocument<AstNode>;
    let exports : AstNodeDescription[];
    let computedNames : string;
    const expectedNames = 'C, C.f, C.m, C.m.p, C.m.v, A';

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
        expect(computedNames).toBe(expectedNames);
    });

});

describe('Default Scope Contexts', () => {

    const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
    let testDoc : LangiumDocument<AstNode>;
    let text : string;
    let refNode: AstNode;
    const expectedScopes = ['f, m, C.f, C.m','v, p, C.m.p, C.m.v'];

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

    test('case 1: SJMemberSelection:member -> f, m, C.f, C.m', () => {
        const context = {
            $type: 'SJMemberSelection',
            $container: refNode,
            $containerProperty: 'member'
        };
        
        const refInfo = {
            reference: {} as Reference,
            container: context,
            property: 'member'
        };

        let tempScope = services.references.ScopeProvider.getScope(refInfo);
        const computedScope = tempScope.getAllElements().map(e => e.name).join(', ');
        expect(expectedScopes[0]).toBe(computedScope);
    });

    test('case 2: SJSymbolRef:symbol -> v, p, C.m.p, C.m.v', () => {
        const context = {
            $type: 'SJSymbolRef',
            $container: refNode,
            $containerProperty: 'symbol'
        };
        
        const refInfo = {
            reference: {} as Reference,
            container: context,
            property: 'symbol'
        };

        let tempScope = services.references.ScopeProvider.getScope(refInfo);
        const computedScope = tempScope.getAllElements().map(e => e.name).join(', ');
        expect(expectedScopes[1]).toBe(computedScope);
    });

})