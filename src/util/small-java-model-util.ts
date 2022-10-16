import { Reference, AstNode, getDocument } from "langium";
import { isSJMethod, SJBlock, SJClass, SJMember, SJMethod, SJStatement } from "../language-server/generated/ast";

export class SmallJavaModeUtil {

    static fields(c: SJClass): SJMember[] {
        return c.members.filter(m => m.$type === 'SJField');
    }

    static methods(c: SJClass): SJMember[] {
        return c.members.filter(m => m.$type === 'SJMethod');
    }

    static returnStatement(m: SJMethod | SJBlock): SJStatement {
        switch(m.$type) {
            case 'SJMethod': return this.returnStatement((m as SJMethod).body);
            case 'SJBlock': return (m as SJBlock).statements.filter(m => m.$type === 'SJReturn')[0];
            default: throw new Error(`returnStatement() called with unknown type: ${m.$type}`);
        }
    }

    static classHierarchy(c: SJClass): Set<Reference<SJClass>> {
        let visited = new Set<Reference<SJClass>>();
        let current = c.superClass;
        while (current != undefined && !visited.has(current)) {
            visited.add(current);
            current = current.ref?.superClass;
        }
        return visited;
    }

    static classHierarchyMethods(c: SJClass): Map<string, SJMethod> {
            let returnMap = new Map<string, SJMethod>();

            [...this.classHierarchy(c)]
                .reverse()
                .flatMap(r => r.ref?.members as SJMember[])
                .forEach(m => returnMap.set(m.name, m as SJMethod));

            return returnMap;
    }

    static classHierarchyMembers(c: SJClass): Array<SJMember> {
        return [...this.classHierarchy(c)].map(r => r.ref)
                    .map(m => m?.members as SJMember[])
                    .flat();
    }

    static memberAsString(m: SJMember): string {
        let methodString = ( isSJMethod(m) ) ? 
              "(" + (m as SJMethod).params.map(p => p.type.ref?.name).join(", ") + ")" : '';
        return m.name + methodString;
    }

    static memberAsStringWithType(m: SJMember): string {
        return this.memberAsString(m) + " : " + m.type.ref?.name
    }

}

export function isDefinedBefore(from: AstNode, to: AstNode): boolean {
        const fromDocument = getDocument(from);
        const toDocument   = getDocument(to);
        
        // In case a variable from another document is referenced (might be illegal?)
        if (fromDocument !== toDocument) {
            return false;
        }

        // If there is no CST for either 'from' or 'to' (i.e. doesn't exist)
        if (!from.$cstNode || !to.$cstNode) {
            return false;
        }

        const fromPosition  = from.$cstNode.offset;
        const toPosition    = to.$cstNode.offset;
        return fromPosition < toPosition;
}
