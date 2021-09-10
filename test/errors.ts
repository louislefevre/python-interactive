export const NAME_ERROR = `Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
NameError: name 'x' is not defined`;

export const TYPE_ERROR = `Traceback (most recent call last):
  File "<stdin>", line 2, in <module>
TypeError: can't multiply sequence by non-int of type 'str'`;

export const IMPORT_ERROR = `Traceback (most recent call last):
  File "<stdin>", line 1, in <module>
ModuleNotFoundError: No module named 'fake_module'`;

// Python 3.9
export const INDENT_ERROR_1 = `File "<stdin>", line 1
    print(x)
IndentationError: unexpected indent`;

// Python 3.6, 3.7, and 3.8
export const INDENT_ERROR_2 = `File "<stdin>", line 1
    print(x)
    ^
IndentationError: unexpected indent`;

// Python 3.9
export const SYNTAX_ERROR_1 = `File "<stdin>", line 1
    10 = 10
    ^
SyntaxError: cannot assign to literal`;

// Python 3.8
export const SYNTAX_ERROR_2 = `File "<stdin>", line 1
SyntaxError: cannot assign to literal`;

// Python 3.6 and 3.7
export const SYNTAX_ERROR_3 = `File "<stdin>", line 1
SyntaxError: can't assign to literal`;

export const INDENT_ERRORS = [INDENT_ERROR_1, INDENT_ERROR_2];

export const SYNTAX_ERRORS = [SYNTAX_ERROR_1, SYNTAX_ERROR_2, SYNTAX_ERROR_3]
