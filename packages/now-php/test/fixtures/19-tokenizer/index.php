<?php

$source = <<<'code'
<?php

class A
{
    const PUBLIC = 1;
}
code;

$tokens = token_get_all($source, TOKEN_PARSE);

foreach ($tokens as $token) {
	if (is_array($token)) {
		echo token_name($token[0]) , PHP_EOL;
	}
}
