/******************************************************************************
 * This file was generated by langium-cli 0.4.0.
 * DO NOT EDIT MANUALLY!
 ******************************************************************************/

import { LangiumGeneratedServices, LangiumGeneratedSharedServices, LangiumSharedServices, LangiumServices, LanguageMetaData, Module } from 'langium';
import { SmallJavaAstReflection } from './ast';
import { SmallJavaGrammar } from './grammar';

export const SmallJavaLanguageMetaData: LanguageMetaData = {
    languageId: 'small-java',
    fileExtensions: ['.smalljava'],
    caseInsensitive: false
};

export const SmallJavaGeneratedSharedModule: Module<LangiumSharedServices, LangiumGeneratedSharedServices> = {
    AstReflection: () => new SmallJavaAstReflection()
};

export const SmallJavaGeneratedModule: Module<LangiumServices, LangiumGeneratedServices> = {
    Grammar: () => SmallJavaGrammar(),
    LanguageMetaData: () => SmallJavaLanguageMetaData,
    parser: {}
};
