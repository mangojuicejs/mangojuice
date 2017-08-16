module.exports = function(options) {
  var t = options.types;
  return {
    visitor: {
      ImportDeclaration: function(p, state) {
        // Find import of lazy block
        if (
          t.isStringLiteral(p.node.source) &&
          p.node.source.value.startsWith("mangojuice-lazy/loader!") &&
          p.node.specifiers.length === 1 &&
          t.isImportNamespaceSpecifier(p.node.specifiers[0])
        ) {
          const blockName = p.node.specifiers[0].local.name;
          state.lazyBlocks = state.lazyBlocks || {};
          state.lazyBlocks[blockName] = true;
        }
      },
      MemberExpression: function(p, state) {
        if (
          !(
            t.isIdentifier(p.node.object) &&
            t.isIdentifier(p.node.property) &&
            p.node.property.name === "Logic" &&
            t.isMemberExpression(p.parent) &&
            state.lazyBlocks &&
            state.lazyBlocks[p.node.object.name]
          )
        ) {
          return;
        }

        var blockIdnt = p.node.object;
        var cmdName = p.parent.property.name;

        // Replace with
        p.parentPath.replaceWith(
          t.callExpression(t.identifier("getLazyCommand"), [
            blockIdnt,
            t.stringLiteral(cmdName)
          ])
        );

        // Add `getLazyCommand` import if did not add
        if (!state.addedLazyImport) {
          state.addedLazyImport = true;
          var progPath = p.findParent(function(pp) {
            return pp.isProgram();
          });

          progPath.pushContainer(
            "body",
            t.importDeclaration(
              [
                t.importSpecifier(
                  t.identifier("getLazyCommand"),
                  t.identifier("getLazyCommand")
                )
              ],
              t.stringLiteral("mangojuice-lazy")
            )
          );
        }
      }
    }
  };
};
