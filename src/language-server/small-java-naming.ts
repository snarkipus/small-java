import { DefaultNameProvider } from 'langium';
import { isSJClass, SJClass } from './generated/ast';

export function toQualifiedName(cls: SJClass, childName: string): string {
    return (isSJClass(cls.$container) ? toQualifiedName(cls.$container, cls.name) : cls.name) + '.' + childName;
}

export class SmallJavaNameProvider extends DefaultNameProvider {

    /**
     * @param qualifier if the qualifier is a `string`, simple string concatenation is done: `qualifier.name`.
     *      if the qualifier is a `PackageDeclaration` fully qualified name is created: `package1.package2.name`.
     * @param name simple name
     * @returns qualified name separated by `.`
     */
    getQualifiedName(qualifier: SJClass | string, name: string): string {
        let prefix = qualifier;
        if (isSJClass(prefix)) {
            prefix = (isSJClass(prefix.$container) ? this.getQualifiedName(prefix.$container, prefix.name) : prefix.name);
        }
        return (prefix ? prefix + '.' : '') + name;
    }
}