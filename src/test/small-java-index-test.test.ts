import { AstNode, AstNodeDescription, EmptyFileSystem, LangiumDocument } from "langium";
import { parseDocument } from "langium/test";
import { createSmallJavaServices } from "../language-server/small-java-module";

const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
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
         exports = await services.references.ScopeComputation.computeExports(testDoc);/*? $.length*/
        computedNames = exports.map(e => e.name).join(', ');
    });

    it('Exports Qualified Names', () => {
        expect(computedNames).toBe(expectedNames);
    });

});
