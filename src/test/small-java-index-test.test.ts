import { AstNode, AstNodeDescription, EmptyFileSystem, LangiumDocument } from "langium";
import { parseDocument, expectCompletion } from "langium/test";
// import { SJMethod, SJProgram, SJReturn } from "../language-server/generated/ast";
import { createSmallJavaServices } from "../language-server/small-java-module";


/**
 * Expected output:
 *  C     <-- class     (SJClass)
 *  C.f   <-- field     (SJMember)
 *  C.m   <-- method    (SJMember)
 *  C.m.p <-- parameter (SJParameter)
 *  C.m.v <-- variable  (SJVariableDeclaration)
 *  A     <-- class     (SJClass)
 */
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

describe('Does magical scoping things', () => {

    const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
    const completion = expectCompletion(services);
    let text : string;

    beforeAll(async () => {
        text=`
        class C {
                A f;
                A m(A p) {
                    A v = null;
                    return <|>;
                }
            }
        class A {}
        `;
    });

    test('magical things should be magical', async () => {
        await completion({
            text,
            index: 0,
            expectedItems: [
                'v','p','C.m.p','C.m.v','true','false','this','super','null','new'
            ]
        });
    });

})