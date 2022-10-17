import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
import { SJProgram } from '../language-server/generated/ast';
import { createSmallJavaServices } from '../language-server/small-java-module';
import { SmallJavaTypeComputer } from '../util/small-java-type-computer';
import { isConformant } from '../util/small-java-type-conformance';

const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
const helper = parseHelper<SJProgram>(services);


describe('Small Java Type Conformance Test', () => {
    
    it('Test Class Conformance', async () => {
        const text = `
        class A {}
        class B extends A {}
        class C {}
        class D extends B {}    
        `;
    
        const parse = await helper(text);
        const classes = parse.parseResult.value.classes;
        expect(isConformant(classes[0], classes[0])).toBeTruthy();
        expect(isConformant(classes[1], classes[0])).toBeTruthy();
        expect(isConformant(classes[2], classes[0])).toBeFalsy();
        expect(isConformant(classes[3], classes[0])).toBeTruthy();
        expect(isConformant(SmallJavaTypeComputer.NULL_TYPE, classes[0])).toBeTruthy();
    })    

})
