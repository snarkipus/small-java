import { parseHelper } from 'langium/test';
import { isSJField, isSJMethod, SJClass, SJMethod, SJProgram, SJReturn, isSJMemberSelection } from '../language-server/generated/ast';
import { createSmallJavaServices } from '../language-server/small-java-module';
import { EmptyFileSystem } from 'langium';
import { SmallJavaModeUtil as util } from '../util/small-java-model-util';

const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
const helper = parseHelper<SJProgram>(services);

describe('Small Java Model Utility Class', () => {

    it('Determines valid class hierarchy', async () => {
        let text=`
        class C {}
        class D extends C {}
        class E extends D {}
        `;

        let parse = await helper(text);
        let classes = parse.parseResult.value.classes;

        assertHierarchy(classes[0], '');
        assertHierarchy(classes[1], 'C');
        assertHierarchy(classes[2], 'D, C');
    });

    it('Determines cyclic hierarchy', async () => {
        let text=`
        class C extends E {}
        class D extends C {}
        class E extends D {}
        `;

        let parse = await helper(text);
        let classes = parse.parseResult.value.classes;

        assertHierarchy(classes[0], 'E, D, C');
        assertHierarchy(classes[1], 'C, E, D');
        assertHierarchy(classes[2], 'D, C, E');
    });

    it('Determines methods by type', async () => {
        let text=`
        class C {
            C f;
            C m() {
                if (true) {
                    
                }
                return this.c;
            }
        }
        `;

        let parse = await helper(text);
        let aClass = parse.parseResult.value.classes[0];
        expect(aClass.members.filter(m => isSJField(m))[0].name).toBe('f');
        expect(aClass.members.filter(m => isSJMethod(m))[0].name).toBe('m');
        let returnStatement = (aClass.members.filter(m => isSJMethod(m))[0] as SJMethod).body.statements[1] as SJReturn;
        expect(isSJMemberSelection(returnStatement.expression)).toBe(true);    
    });

    describe('Determines Method Hierarchy', () => {
        const text=`
        class C1 {
            C1 m() { return null; }
            C1 n() { return null; }
        }
        class C2 extends C1 {
            C1 m() { return null; } // this must override the one in C1
        }
        class C3 extends C2 {
        }
        `;
    
        it('Should trace member hierarchy', async () => {
            let parse = await helper(text);
            const expected = 'm -> C2, n -> C1';
            const classTest = parse.parseResult.value.classes[2];
            const refMap = util.classHierarchyMethods(classTest);
            const actual = [...refMap.entries()]
                                .map(([key, value]) => key + " -> " + (value.$container as SJClass).name)
                                .join(", ");
            expect(expected).toBe(actual);
        });
    })

    describe('Determines Member Hierarchy', () => {
        const text=`
        class C1 {
            C1 m;
            C1 m() { return null; }
            C1 n() { return null; }
            C1 n;
        }
        class C2 extends C1 {
            C1 f;
            C1 m() { return null; } // this must come before the one in C1
        }
        class C3 extends C2 {
        }
        `;
    
        it('Should trace member hierarchy', async () => {
            const parse = await helper(text);
            const expected = 'SJField f in C2, SJMethod m in C2, SJField m in C1, SJMethod m in C1, SJMethod n in C1, SJField n in C1';
            const classTest = parse.parseResult.value.classes[2];
            const actual = util.classHierarchyMembers(classTest);
            expect(actual.map(c => c.$type + ' ' + c.name + ' in ' + (c.$container as SJClass).name).join(', ')).toBe(expected);
        });

        it('Should support members as string with type', async () => {
            const text=`
            class A {}
            class B {}
            class C {
                A f;
                A m() { return null; }
                A n(B b, C c) { return null; }
                A p(Foo b, C c) { return null; }
            }
            `;

            const parse = await helper(text);
            const lastClass = parse.parseResult.value.classes[2];
            let methods = lastClass.members.filter(m => isSJMethod(m));
            let fields = lastClass.members.filter(m => isSJField(m));
            expect(util.memberAsStringWithType(methods[0])).toBe('m() : A');
            expect(util.memberAsStringWithType(fields[0])).toBe('f : A');
        });
    })

    function assertHierarchy(c: SJClass, expected: string) {
        let hierarchy = util.classHierarchy(c);
        let output: string[] = new Array;
        if (hierarchy.size == 0) {
            output.push('');
        } else {
            hierarchy.forEach(ref => {
                output.push(ref.ref!.name);
            });
        }
        expect(output.join(', ')).toBe(expected);
    }
})