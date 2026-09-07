import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const customRoots = process.argv.slice(2);
const sourceRoots = customRoots.length > 0 ? customRoots : ['app', 'components', 'lib'];
const sourceExtensions = new Set(['.ts', '.tsx', '.mts']);
const ignoredPathParts = new Set(['node_modules', '.next', 'coverage']);
const languageDirectory = `${path.sep}lib${path.sep}i18n${path.sep}`;
const nonInterfaceContentFiles = new Set([
  path.normalize('lib/newsletter/defaults.ts'),
  path.normalize('lib/newsletter/module-registry.ts'),
  path.normalize('lib/newsletter/template-files.ts'),
  path.normalize('lib/settings/defaults.ts'),
]);
const interfaceSupportFiles = new Set([
  path.normalize('lib/assets/upload.ts'),
  path.normalize('lib/email/templates/magic-link.ts'),
  path.normalize('lib/events/schema.ts'),
  path.normalize('lib/newsletter/export-validation.ts'),
  path.normalize('lib/newsletter/save-validation.ts'),
  path.normalize('lib/newsletter/schema.ts'),
  path.normalize('lib/settings/schema.ts'),
]);

const copyPropertyNames = new Set([
  'alt',
  'aria-label',
  'body',
  'description',
  'error',
  'helpText',
  'hint',
  'intro',
  'label',
  'message',
  'placeholder',
  'summary',
  'title',
]);
const technicalJsxAttributes = new Set([
  'accept',
  'action',
  'autoComplete',
  'className',
  'data-editor-ui',
  'data-newsletter-theme',
  'data-onboarding-step',
  'data-testid',
  'data-tour',
  'fill',
  'formAction',
  'href',
  'htmlFor',
  'id',
  'key',
  'method',
  'name',
  'rel',
  'role',
  'src',
  'style',
  'target',
  'type',
  'value',
  'viewBox',
]);
const technicalPropertyNames = new Set([
  'backgroundColor',
  'behavior',
  'block',
  'borderColor',
  'class',
  'className',
  'code',
  'color',
  'contentType',
  'cursor',
  'display',
  'download',
  'event',
  'eventType',
  'fill',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'height',
  'href',
  'id',
  'inline',
  'level',
  'lineHeight',
  'method',
  'mimeType',
  'mode',
  'name',
  'objectFit',
  'operation',
  'outline',
  'overflow',
  'padding',
  'path',
  'position',
  'protocol',
  'publicUrl',
  'reason',
  'rel',
  'role',
  'severity',
  'selector',
  'src',
  'status',
  'storageKey',
  'target',
  'textAlign',
  'textTransform',
  'transform',
  'type',
  'url',
  'userId',
  'verticalAlign',
  'whiteSpace',
  'width',
]);
const copyCallNames = new Set([
  'alert',
  'badRequest',
  'conflict',
  'confirm',
  'forbidden',
  'notFound',
  'prompt',
  'unauthenticated',
  'validationError',
]);

function collectSourceFiles(entryPath) {
  if (ignoredPathParts.has(path.basename(entryPath))) return [];
  const stat = statSync(entryPath);
  if (stat.isFile()) return sourceExtensions.has(path.extname(entryPath)) ? [entryPath] : [];

  return readdirSync(entryPath, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredPathParts.has(entry.name)) return [];
    const fullPath = path.join(entryPath, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    if (!sourceExtensions.has(path.extname(entry.name))) return [];
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) return [];
    return [fullPath];
  });
}

function propertyName(node) {
  const name = node?.name;
  if (!name) return null;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return null;
}

function callName(node) {
  if (!ts.isCallExpression(node)) return null;
  if (ts.isIdentifier(node.expression)) return node.expression.text;
  if (ts.isPropertyAccessExpression(node.expression)) return node.expression.name.text;
  return null;
}

function isInside(node, predicate) {
  let current = node.parent;
  while (current) {
    if (predicate(current)) return true;
    if (ts.isSourceFile(current)) return false;
    current = current.parent;
  }
  return false;
}

function enclosingJsxAttribute(node) {
  let current = node.parent;
  while (current && !ts.isSourceFile(current)) {
    if (ts.isJsxAttribute(current)) return current;
    if (ts.isJsxElement(current) || ts.isJsxSelfClosingElement(current) || ts.isJsxFragment(current)) return null;
    current = current.parent;
  }
  return null;
}

function isTranslationKey(node) {
  const parent = node.parent;
  return (
    ts.isCallExpression(parent) &&
    parent.arguments[0] === node &&
    ts.isIdentifier(parent.expression) &&
    parent.expression.text === 't'
  );
}

function isModuleSpecifier(node) {
  const parent = node.parent;
  return (
    (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isExternalModuleReference(parent)) &&
    parent.moduleSpecifier === node
  );
}

function isTechnicalLiteral(value, node) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized === 'use client' || normalized === 'use server') return true;
  if (isModuleSpecifier(node) || isTranslationKey(node)) return true;
  if (/^(?:https?:|mailto:|data:|\/|\.\/|\.\.\/|#|\?)/i.test(normalized)) return true;
  if (/^(?:text|image|application)\//i.test(normalized)) return true;
  if (/^[a-z]{2}(?:-[A-Z]{2})?$/.test(normalized)) return true;
  if (/^\{[A-Za-z][A-Za-z0-9]*\}$/.test(normalized)) return true;
  if (/^(?:px|rem|em|KB|MB|GB)(?:\s*·)?$/i.test(normalized)) return true;
  if (/^(?:attachment;|private,|public,|no-cache|no-store)/i.test(normalized)) return true;
  if (/<\/?[A-Za-z!][^>]*>/.test(normalized)) return true;
  if (/^[A-Z][A-Za-z0-9]*Error$/.test(normalized)) return true;
  if (/^(?:Enter|Escape|Tab|Space|ArrowUp|ArrowDown|ArrowLeft|ArrowRight)$/.test(normalized)) return true;
  if (/^[A-Z][A-Z0-9_:-]*$/.test(normalized)) return true;
  if (/^[a-z][A-Za-z0-9_$.:/-]*$/.test(normalized)) return true;
  if (/^(?:rgb|rgba|hsl|hsla|var|calc|translate|minmax)\(/i.test(normalized)) return true;
  if (/^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/.test(normalized) && /\d/.test(normalized)) return true;
  if (normalized.includes('{…}') && (normalized.match(/[A-Za-zÄÖÜäöüß]+/g) ?? []).length <= 1) return true;
  if (normalized.includes('{…}') && /^[a-z0-9_$.:/-]*\{…\}[a-z0-9_$.:/-]*$/i.test(normalized.replace(/\s+/g, '')))
    return true;

  const attribute = enclosingJsxAttribute(node);
  if (attribute && (technicalJsxAttributes.has(attribute.name.text) || /^on[A-Z]/.test(attribute.name.text)))
    return true;

  const property = node.parent;
  if (ts.isPropertyAssignment(property) && technicalPropertyNames.has(propertyName(property))) return true;

  if (ts.isCallExpression(property) && callName(property) === 'default') return true;

  const declaration = isInside(node, (ancestor) => {
    if (!ts.isVariableDeclaration(ancestor) || !ts.isIdentifier(ancestor.name)) return false;
    return /(?:class|className|styles?|paths?)$/i.test(ancestor.name.text);
  });
  if (declaration) return true;

  const classHelper = isInside(node, (ancestor) => {
    if (!ts.isFunctionDeclaration(ancestor) || !ancestor.name) return false;
    return /class(?:Name)?$/i.test(ancestor.name.text);
  });
  if (classHelper) return true;

  return isInside(
    node,
    (ancestor) =>
      ts.isTaggedTemplateExpression(ancestor) && ts.isIdentifier(ancestor.tag) && ancestor.tag.text === 'sql',
  );
}

function isDirectInterfaceContext(node, interfaceFile) {
  const attribute = enclosingJsxAttribute(node);
  if (attribute) return !technicalJsxAttributes.has(attribute.name.text);
  if (isInside(node, (ancestor) => ts.isJsxExpression(ancestor))) return true;

  const parent = node.parent;
  if (isInside(node, (ancestor) => ts.isPropertyAssignment(ancestor) && copyPropertyNames.has(propertyName(ancestor))))
    return true;
  if (
    interfaceFile &&
    isInside(node, (ancestor) => ts.isNewExpression(ancestor) && ancestor.expression.getText() === 'Error')
  )
    return true;
  if (isInside(node, (ancestor) => ts.isCallExpression(ancestor) && copyCallNames.has(callName(ancestor)))) return true;
  if (interfaceFile && ts.isArrayLiteralExpression(parent)) return true;
  return false;
}

function isProbablyInterfaceCopy(value, node, sourceFile) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (!/[A-Za-zÄÖÜäöüß]/.test(normalized)) return false;
  if (
    ts.isJsxText(node) &&
    !/^[A-Z][A-Z0-9_]*_[A-Z0-9_]+$/.test(normalized) &&
    !/^(?:px\s*·|KB|H[1-6]|B|I|U)$/.test(normalized)
  )
    return true;
  if (isTechnicalLiteral(normalized, node)) return false;

  const relativeFile = path.normalize(path.relative(process.cwd(), sourceFile.fileName));
  const interfaceFile =
    customRoots.length > 0 ||
    relativeFile.startsWith(`app${path.sep}`) ||
    relativeFile.startsWith(`components${path.sep}`) ||
    interfaceSupportFiles.has(relativeFile);
  const directContext = isDirectInterfaceContext(node, interfaceFile);
  if (directContext) return true;
  if (!interfaceFile) return false;

  const words = normalized.match(/[A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]*/g) ?? [];
  if (words.length >= 2) return true;
  return /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß-]+[.!?:]?$/.test(normalized);
}

function literalValue(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) {
    return [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' {…} ');
  }
  return null;
}

function lineAndColumn(sourceFile, node) {
  const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  return `${position.line + 1}:${position.character + 1}`;
}

const findings = [];
const sourceFiles = sourceRoots.flatMap((root) => collectSourceFiles(root));

for (const file of sourceFiles) {
  const normalizedFile = path.normalize(file);
  const absoluteFile = path.resolve(file);
  if (absoluteFile.includes(languageDirectory) || nonInterfaceContentFiles.has(normalizedFile)) continue;

  const source = ts.createSourceFile(
    file,
    ts.sys.readFile(file) ?? '',
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  function visit(node) {
    if (ts.isJsxText(node)) {
      const value = node.text.trim().replace(/\s+/g, ' ');
      if (isProbablyInterfaceCopy(value, node, source)) findings.push({ file, node, source, value });
    } else {
      const value = literalValue(node);
      if (value !== null && isProbablyInterfaceCopy(value, node, source)) {
        findings.push({ file, node, source, value: value.trim().replace(/\s+/g, ' ') });
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (findings.length > 0) {
  console.error(
    'Dezentral gepflegte Interface-Texte gefunden. Bitte in lib/i18n/locales/de.ts und en.ts hinterlegen und per t(...) referenzieren:',
  );
  for (const finding of findings) {
    console.error(`- ${finding.file}:${lineAndColumn(finding.source, finding.node)}: ${finding.value}`);
  }
  process.exit(1);
}
