import { AstNode, CstNode, DefaultDocumentSymbolProvider, LangiumDocument } from "langium";
import { DocumentSymbol, SymbolKind } from "vscode-languageserver";
import { isSJMember } from "../language-server/generated/ast";
import { SmallJavaModeUtil } from "../util/small-java-model-util";

export class SmallJavaDocumentSymbolProvider extends DefaultDocumentSymbolProvider {

    protected getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] {
        const node = astNode.$cstNode;
        const nameNode = this.nameProvider.getNameNode(astNode);
        if (nameNode && node) {
            return [{
                kind: this.getSymbolKind(astNode.$type ?? SymbolKind.Field),
                name: this.nameText(astNode,nameNode),
                range: node.range,
                selectionRange: nameNode.range,
                children: this.getChildSymbols(document, astNode)
            }];
        } else {
            return this.getChildSymbols(document, astNode) || [];
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected getSymbolKind(type: string): SymbolKind {
        switch(type) {
            case 'SJMethod':                return SymbolKind.Method;
            case 'SJVariableDeclaration':
            case 'SJParameter':
            case 'SJField':                 return SymbolKind.Field;
            case 'SJClass':                 return SymbolKind.Class;
            default: throw new Error(`getSymbolKind() called with unknown type: ${type}`);
        }
    }

    protected nameText(node: AstNode, nameNode: CstNode): string {
        const name = this.nameProvider.getName(node);
        if (isSJMember(node)) {
            return SmallJavaModeUtil.memberAsString(node) + " : " + node.type.ref?.name;
        } else if (!name) {
            return nameNode.text;
        } else {
            return name;
        }
    }
}
