import { expectError, expectNoIssues, validationHelper, ValidationResult } from 'langium/test';
import { SJClass,  SJIfStatement, SJMember, SJMemberSelection, SJMethod, SJNew, SJProgram, SJVariableDeclaration, SmallJavaAstType } from '../language-server/generated/ast';
import { createSmallJavaServices } from '../language-server/small-java-module';
import { EmptyFileSystem } from 'langium';
import { classHierarchy } from '../util/small-java-model-util';

const services = createSmallJavaServices(EmptyFileSystem).SmallJava;
const validate = validationHelper<SJProgram>(services);

describe('Small Java Validator: Valid Hierarchy', () => {
    const text=`
    class A extends C {}
    class C extends B {}
    class B {}
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect no cycle hierarchies', () => {
        expectNoIssues(validationResult);
    });
});

describe('Small Java Validator: Hierarchy Cycles', () => {
    const text=`
    class A extends C {}
    class C extends B {}
    class B extends A {}
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect cycle hierarchies', () => {
        const rule = validationResult.document.parseResult.value.classes;
        for (let i = 0; i < 3; i++) {
            expectError(validationResult, "cycle in hierarchy of class '" + rule[i].name + "'",
            {
                node: rule[i],
                property: {
                    name: 'name'
                }
            });
        }
    });
});

describe('Small Java Validator: Method Invocation on Field', () => {
    const text=`
    class A {
        A f;
        A m() {
            return this.f();
        }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect method invocation on a field', () => {
        const mark = validationResult.document.textDocument.getText().lastIndexOf('(');
        expectError(validationResult, "Method invocation on a field",
        {
            offset: mark,
            length: 1
        });
    });
});

describe('Small Java Validator: Field Selection on a Method', () => {
    const text=`
    class A {
        A m() {
            return this.m;
        }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect field selections on a method', () => {
        const mark = validationResult.document.textDocument.getText().lastIndexOf('m');
        expectError(validationResult, "Field selection on a method",
        {
            offset: mark,
            length: 1
        });
    });
});


describe('Small Java Validator: Member Selection', () => {
    const text=`
    class A {
        A f;
        A m() {
            A v = this.f;
          return this.m();
        }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect no errors on valid member selection', () => {
        expectNoIssues(validationResult);
    });

})


describe('Small Java Validator: Unreachable Code', () => {
    const text=`
    class C {
        C m() {
            return null;
            this.m(); // <--- unreachable code
        }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect unreachable code', () => {
        const rule = validationResult.document.parseResult.value.classes[0];
        expectError(validationResult, "Unreachable code",
        {
            node: (rule.members[0] as SJMethod).body.statements[1] as SJMemberSelection,
        });
    });
});

describe('Small Java Validator: Unreachable Code 2', () => {
    const text=`
    class C {
        C m() {
            return null;
            C i = null; // <--- unreachable code
            this.m();
        }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect unreachable code', () => {
        const rule = validationResult.document.parseResult.value.classes[0];
        expectError(validationResult, "Unreachable code",
        {
            node: (rule.members[0] as SJMethod).body.statements[1] as SJVariableDeclaration,
        });
    });
});

describe('Small Java Validator: Unreachable Code Only Once (BROKEN)', () => {
    const text=`
    class C {
        C m() {
            return null;
            C i = null; // error only here
            return null;
            return null; // no error here
        }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect unreachable code only once (SHOULD FAIL)', () => {
        const rule = validationResult.document.parseResult.value.classes[0];
        expectError(validationResult, "Unreachable code",
        {
            node: (rule.members[0] as SJMethod).body.statements[3] as SJVariableDeclaration,
        });
    });
});

describe('Small Java Validator: Unreachable Code Inside IF (BROKEN)', () => {
    const text=`
    class C {
        C m() {
            if (true) {
                return null;
                C i = null;
                this.m();
            }
            return null;
        }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect unreachable code inside IF block', () => {
        const rule = ((validationResult.document.parseResult.value
                        .classes[0]
                        .members[0] as SJMethod)
                        .body
                        .statements[0] as SJIfStatement)
                        .thenBlock
                        .statements[1];
        expectError(validationResult, "Unreachable code",
        {
            node: rule,
        });
    });
})

describe('Small Java Validator: No Unreachable Code', () => {
    const text=`
    class C {
        C m() {
            this.m();
            return null;
        }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('should not detect any errors', () => {
        expectNoIssues(validationResult);
    });
});


describe('Small Java Validator: Missing Final Return', () => {
    const text=`
    class C {
        C m() {
            this.m();
        }
    }
    `;

   let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect missing returns from methods', () => {
        const rule = validationResult.document.parseResult.value.classes[0];
        expectError(validationResult, "Method must have a return statement",
        {
            node: rule.members[0] as SJMethod,
            property: {
                name: 'body'
            }
        });
    });
});

describe('Small Java Validator: Duplicate Elements', () => {
    const text=`
    class C {}
    class C {}
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect duplicate classes', () => {
        assertDuplicate(text, SJClass, 'class', 'C', validationResult);
    });

});

describe('Small Java Validator: Duplicate Fields', () => {
    const text=`
    class C {
        C f;
        C f;
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect duplicate fields', () => {
        assertDuplicate(text, SJClass, 'field', 'f', validationResult);
    });

});

describe('Small Java Validator: Duplicate Methods', () => {
    const text=`
    class C {
        C m() { return null; }
        C m() { return null; }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect duplicate methods', () => {
        assertDuplicate(text, SJClass, 'method', 'm', validationResult);
    });

});

describe('Small Java Validator: Duplicate parameters', () => {
    const text=`
    class C {
        C m(C p, C p) { return null; }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect duplicate parameters', () => {
        assertDuplicate(text, SJClass, 'parameter', 'p', validationResult);
    });

});

describe('Small Java Validator: Duplicate variables', () => {
    const text=`
    class C {
        C m() {
            C v = null;
            if (true)
                C v = null;
            return null;
        }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should detect duplicate variables', () => {
        assertDuplicate(text, SJClass, 'variable', 'v', validationResult);
    });

});

describe('Small Java Validator: Field and Method with same name is OK', () => {
    const text=`
    class C {
        C f;
        C f() { return null; }
    }
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should not detect issues', () => {
        expectNoIssues(validationResult);
    });

});

describe('Small Java Validator: Test Valid Hierarchy', () => {
    const text=`
    class C {}
		
    class D extends C {}
    
    class E extends D {} 
    `;

    let validationResult: ValidationResult<SJProgram>;

    beforeAll(async () => {
        validationResult = await validate(text);
    });

    it('Should not detect issues', () => {
        expectNoIssues(validationResult);
        const classes = validationResult.document.parseResult.value.classes;
        assertHierarchy(classes[0], '');
        assertHierarchy(classes[1], 'C');
        assertHierarchy(classes[2], 'D, C');
    });
})

describe('Small Java Validator: Incompatible Types', () => {

   it('Variable Declarations', () => {
        const text=`A v = new C();`;    
        assertIncompatibleTypes(text, SJNew, 'A', 'C');
    });

    it('Return Expressions', () => {
        const text=`return new C();`;    
        assertIncompatibleTypes(text, SJNew, 'A', 'C');
    });

    it('Argument Expressions', () => {
        const text=`this.m(new C());`;    
        assertIncompatibleTypes(text, SJNew, 'A', 'C');
    });

    it('If Expressions', () => {
        const text=`if (new C()) { return null; } `;    
        assertIncompatibleTypes(text, SJNew, 'booleanType', 'C');
    });

    it('Assignments', () => {
        const text=`A v = null; v = new C();`;    
        assertIncompatibleTypes(text, SJNew, 'A', 'C');
    });
})

describe('Small Java Validator: Invalid Number of Arguments', () => {

    it('Detects too few arguments', async () => {
        const text=`
        class A {}
        class B {}
        class C {
            C m(A a, B b) { return this.m(new B()); }
        }
        `;
        
        const validationResult = await validate(text);
        const index = validationResult.document.textDocument.getText().indexOf('new');

        expectError(
            validationResult,
            "Invalid number of arguments. Expected 2 but was 1",
            {
                offset: index,
                length: 7,
            }
        );

    });

});

describe.skip('Small Java Validator: Method Overrides', () => {
    let validationResult: ValidationResult<SJProgram>;
    let rule1: SJMember;
    let rule2: SJMember;

    beforeAll(async () => {
    const text=`
        class A {
            A m(A a) { return null; }
            B n(A a) { return null; }
        }

        class B extends A {
            // parameters must have the same type
            A m(B a) { return null; }
            // return type cannot be a supertype
            A n(A a) { return null; }
        }

        class C extends A {
            // return type can be a subtype
            B m(A a) { return null; }
        }
        `;

        validationResult = await validate(text);

        rule1 = validationResult.document.parseResult.value
                    .classes[1]
                    .members[0];

        rule2 = validationResult.document.parseResult.value
                    .classes[1]
                    .members[1];
    });
    

    it('Detects invalid method override (1)', () => {
        expectError(
            validationResult,
            "The method 'm' must override a superclass method",
            {
                node: rule1,
            }
        );
    });

    it('Detects invalid method override (2)', () => {
        expectError(
            validationResult,
            "The method 'n' must override a superclass method",
            {
                node: rule2,
            }
        );
    });

    it('Detects invalid method override (3)', () => {
        expect(validationResult.diagnostics.length).toBe(2);
    });
});

function assertDuplicate(input: string, type: SmallJavaAstType, desc: string, name: string, result: ValidationResult<SJProgram>) {
    const headMark = result.document.textDocument.getText().indexOf(name);
    const tailMark = result.document.textDocument.getText().lastIndexOf(name);
    expectError(
        result,
        'Duplicate ' + desc + ' "' + name + '"',
        {
            offset: headMark,
            length: name.length
        }
    )
    expectError(
        result,
        'Duplicate ' + desc + ' "' + name + '"',
        {
            offset: tailMark,
            length: name.length
        }
    )
}

function assertHierarchy(c: SJClass, expected: string) {
    const classRefSet = classHierarchy(c);
    const clsHierarchy = [...classRefSet].map(r => r.ref?.name).join(', ');
    expect(clsHierarchy).toBe(expected);
}

async function assertIncompatibleTypes(methodBody: string, c: SmallJavaAstType, expectedType: string, actualType: string) {
    const text=`
    class A {}
    class B extends A {}
    class C {
        A f;
        A m(A p) {
        ${methodBody}
        return null;
        }
    }
    `;

    const validationResult = await validate(text);
    const index = validationResult.document.textDocument.getText().indexOf('new');
    
    expectError(
        validationResult,
        "Incompatible types. Expected " + expectedType + " but was " + actualType,
        {
            offset: index,
            length: 7
        }
    )
}
