grammar SmallJava

hidden terminal WS: /\s+/;
terminal ID: /[_a-zA-Z][\w_]*/;
terminal INT returns number: /[0-9]+/;
terminal STRING: /"[^"]*"|'[^']*'/;

hidden terminal ML_COMMENT: /\/\*[\s\S]*?\*\//;
hidden terminal SL_COMMENT: /\/\/[^\n\r]*/;

entry SJProgram:
    (classes+=SJClass)*
;

SJClass: 
    'class' name=ID ('extends' superClass=[SJClass])? '{'
        (members+=SJMember)*
    '}'
;
// fragment SJTypedDeclaration:
// 	type=[SJClass] name=ID
// ;

SJMember infers SJMember: 
    SJField | SJMethod
;

SJField: 
    type=[SJClass] name=ID ';'
;

SJMethod:
    type=[SJClass] name=ID
    '(' (params+=SJParameter (',' params+=SJParameter)*)? ')'
    body=SJBlock
;

SJParameter:
    type=[SJClass] name=ID
;

SJVariableDeclaration:
    type=[SJClass] name=ID '=' expression=SJExpression ';'
;

SJBlock:
    {infer SJBlock} '{' statements+=SJStatement* '}'
;

SJStatement:
      SJVariableDeclaration
    | SJReturn
    | SJExpression ';'
    | SJIfStatement
;

SJReturn:
    'return' expression=SJExpression ';'
;

SJIfStatement:
    'if' '(' expression=SJExpression ')' thenBlock=SJIfBlock
    ('else' elseBlock=SJIfBlock)?
;

SJIfBlock infers SJBlock:
    statements+=SJStatement | SJBlock
;

SJSymbol:
    SJVariableDeclaration | SJParameter
;

SJNamedElement:
    SJClass | SJMember | SJSymbol
;

SJExpression:
    SJAssignment
;

SJAssignment infers SJExpression:
    SJSelectionExpression ({infer SJAssignment.left=current} '=' right=SJExpression)?
;

SJSelectionExpression infers SJExpression:
    SJTerminalExpression
    (
        {infer SJMemberSelection.receiver=current} '.' 
        member=[SJMember] 
        (methodInvocation?='('
            (args+=SJExpression (',' args+=SJExpression)*)? ')'
        )?
    )*
;

SJTerminalExpression infers SJExpression:
      {infer SJStringConstant} value=STRING
    | {infer SJIntConstant} value=INT
    | {infer SJBoolConstant} value=('true' | 'false')
    | {infer SJThis} 'this'
    | {infer SJSuper} 'super'
    | {infer SJNull} 'null'
    | {infer SJSymbolRef} symbol=[SJSymbol]
    | {infer SJNew} 'new' type=[SJClass] '(' ')'
    | '(' SJExpression ')'
;

QualifiedName returns string:
    ID ('.' ID)*;