
## Syntax

Flipbox allows you to place two elements back-to-back and then flip between them.

```
	<x-flipbox>
		<x-card>
			<div>Front</div>
			<div>Back</div>
		</x-card>
	</x-flipbox>
```

## Usage

```

	var flipbox = document.createElement('x-flipbox');
	flipbox.flipDirection = "up"; //   up, down, left, right
	flipbox.flipped = true;
```


