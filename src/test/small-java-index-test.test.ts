import { EmptyFileSystem } from "langium";
import { parseHelper } from "langium/test";
import { SJProgram } from "../language-server/generated/ast";
// import { SmallJavaIndex } from "../language-server/small-java-index";
import { createSmallJavaServices } from "../language-server/small-java-module";
import { SmallJavaNameProvider } from "../language-server/small-java-naming";

const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
const parse = parseHelper<SJProgram>(services);

// @Test def void testExportedEObjectDescriptions() {
//     '''
//         class C {
//           A f;
//           A m(A p) {
//             A v = null;
//             return null;
//           }
//         }
//         class A {}
//     '''.parse.assertExportedEObjectDescriptions("C, C.f, C.m, C.m.p, A")
//     // before SmallJavaResourceDescriptionsStrategy the output was
//     // "C, C.f, C.m, C.m.p, C.m.v, A"
// }

describe('Small Java Index: Qualified Names', () => {
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

    beforeAll(async () => {
        const test = await parse(text); //?.
        // const doc = test.parseResult.value;
        console.log(test);
        const name = (services.references.NameProvider as SmallJavaNameProvider).getQualifiedName('m', 'p');
        console.log(name); //? 
    });

    it('temp', () => {
        expect('A').toBe('A');
    });
});