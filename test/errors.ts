export const NAME_ERROR = `Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
NameError: name 'x' is not defined`;

export const INDENT_ERROR = `File "<stdin>", line 1
    print(x)
IndentationError: unexpected indent`;

export const IMPORT_ERROR = `Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
ModuleNotFoundError: No module named 'fake_module'`;

export const SYNTAX_ERROR = `File "<stdin>", line 1
    10 = 10
    ^
SyntaxError: cannot assign to literal`;

export const TYPE_ERROR = `Traceback (most recent call last):
  File "<stdin>", line 2, in <module>
TypeError: can't multiply sequence by non-int of type 'str'`;
