
function RenderRichText(text){
	const TextDecoration =
	{
		None : 0,
		Underline       : 0b000000001,
		Strikethrough   : 0b000000010,
		Overline        : 0b000000100,
		DoubleUnderline : 0b000001000 | 0b000000001,//TextDecoration.Underline,
		Framed          : 0b000010000,
		Encircled       : 0b000100000,
		DoubleOverline  : 0b001000000 | 0b000000100,//TextDecoration.Overline,
		Concealed       : 0b010000000,
		StressMarking   : 0b100000000,
	};
	const SizeUnit = 
	{
		Character: 0,
		Pixel: 7
	};
	const defaultLineSpacing = 1;
	var currentLineSpacing;
	var sizeUnit = 0;
	
	function createHtmlElementsForRichText(txt){
		const rootElem = document.createElement('span');
		rootElem.style.textDecorationSkipInk = 'none';
		rootElem.style.textUnderlinePosition = 'under';
		rootElem.style.lineHeight = '1lh;';
		const tokens = TokenizeChars(txt);
		tokens.forEach(token=>{
			if(token.token==='\n'){
				rootElem.appendChild(document.createElement('br'));
			}else{
				if(Object.keys(token.style).length===0){
					rootElem.append(token.token);
				}else{
					let txtElem = document.createElement('span');
					txtElem.style.color = token.style.Color;
					txtElem.style.backgroundColor = token.style.BackgroundColor;
					txtElem.style.textDecorationColor = token.style.DecorationColor;
					
					if(token.style.FontWeight)
						txtElem.style.style.fontWeight = token.style.FontWeight;
					if(token.style.ObliqueAngle)
						txtElem.style.style.fontStyle = "oblique "+token.style.ObliqueAngle+"deg";
					
					if(token.style.Decoration){
						const hasUnderline       = (token.style.Decoration & TextDecoration.Underline      ) > 0;
						const hasStrikethrough   = (token.style.Decoration & TextDecoration.Strikethrough  ) > 0;
						const hasOverline        = (token.style.Decoration & TextDecoration.Overline       ) > 0;
						const hasDoubleUnderline = (token.style.Decoration & TextDecoration.DoubleUnderline) > 0;
						const hasFramed          = (token.style.Decoration & TextDecoration.Framed         ) > 0;
						const hasEncircled       = (token.style.Decoration & TextDecoration.Encircled      ) > 0;
						const hasDoubleOverline  = (token.style.Decoration & TextDecoration.DoubleOverline ) > 0;
						const hasConcealed       = (token.style.Decoration & TextDecoration.Concealed      ) > 0;
						const hasStressMarking   = (token.style.Decoration & TextDecoration.StressMarking  ) > 0;
						
						let tokenElem = txtElem;
						let currentElem = txtElem;
						if(hasFramed){
							currentElem.style.outline = "1px solid "+txtElem.style.textDecorationColor;
							currentElem.style.outlineOffset = '-1px';
						}
						if(hasEncircled){
							if(hasFramed){
								let newElem = document.createElement('span');
								currentElem.appendChild(newElem);
								currentElem = newElem;
							}
							currentElem.style.borderRadius = '50%';
							currentElem.style.outline = "1px solid "+txtElem.style.textDecorationColor;
							currentElem.style.outlineOffset = '-1px';
						}
						let decorationStack = [];
						if (hasUnderline)
						{
							decorationStack.push('underline '+(hasDoubleUnderline?'double':'solid'));
						}
						if (hasStrikethrough)
						{
							decorationStack.push('line-through solid');
						}
						if (hasOverline)
						{
							decorationStack.push('overline '+(hasDoubleUnderline?'double':'solid'));
						}
						if (hasStressMarking)
						{
							//TODO idk what this is supposed to look like
						}
						txtElem.style.textDecoration = decorationStack[0];
						currentElem.style.textDecoration = decorationStack[0];
						rootElem.appendChild(tokenElem);

						for (let i = 1; i < decorationStack.length; ++i) {
							let newSpan = document.createElement('span');
							newSpan.style.textDecoration = decorationStack[i];
							currentElem.appendChild(newSpan);
							currentElem = newSpan;
						}
						if(hasConcealed){
							currentElem.style.visibility = 'hidden';
						}
						currentElem.append(token.token);
					}else{
						txtElem.append(token.token);
					}
					
					rootElem.appendChild(txtElem);
				}
			}
		});
		return {'tokens':tokens,'elemTree':rootElem};
	}
	
	function TokenizeChars(txt){
		let tokens = [];
		let currentToken = '';
		let currentStyle = ({});
		const txt_arr = [...txt]
		for(let i=0;i<txt_arr.length;++i)
		{
			let c = txt_arr[i];
			switch(c){
				case '\n':
					if(currentToken.length > 0){
						tokens.push({'token':currentToken,'style':structuredClone(currentStyle)});
						currentToken = '';
					}
					tokens.push({'token':c,'style':structuredClone(currentStyle)});
					break;
				case '\x1B':
					if(txt_arr.length >= i+1 && txt_arr[i+1]=='['){
						i += 1;
						//fallthrough
					}else{
						break;
					}
				case '\x9B':
				{
					if(currentToken.length > 0){
						tokens.push({'token':currentToken,'style':structuredClone(currentStyle)});
						currentToken = '';
					}
					let start = i +1;
					let i_temp = i;
					i_temp += 2; // Skip over the escape and the '['

					// Collect until we find a character in the range ['\x40' and '\x7F'] or the end of the string
					while (i_temp < txt_arr.length && !((c = txt_arr[i_temp]) >= '\x40' && c <= '\x7F'))
					{
						i_temp++;
					}
					if (i_temp < txt_arr.length)
					{
						// Note: some of the escape codes have a space as the penultimate character
						if (txt_arr[i_temp - 1] == '\x20')
						{
							// Capture the full parameter, excluding the ESC and '[' and ending characters
							let parameters = txt_arr.slice(start, i_temp).join('');
							// Excerp from ECMA-48 section 5.4.2 "Parameter string format":
							// b) Each parameter sub-string consists of one or more bit combinations from 03/00 to 03/10;
							//   the bit combinations from 03/00 to 03/09 represent the digits ZERO to NINE;
							//   bit combination 03/10 may be used as a separator in a parameter sub-string,
							//    for example, to separate the fractional part of a decimal number from the integer part of that number.
							parameters = parameters.replaceAll('\x3A', '.');
							// Note: our code intentially allows for positive and negative signs in parameter strings, 
							// but ECMA-48 only allows for the bit combinations from \x30 to \x3F
							// Note ECMA-48 says the range \x3C and \x3F is intended for private use,
							// so we could use the characters in the range \x3C and \x3F for positive/negative sig
							///See: <see cref="CSICommands20"/>
							switch (txt_arr[i_temp])
							{
								/*
								* See Table 4 in ECMA-48 ( https://www.ecma-international.org/publications-and-standards/standards/ecma-48/ )
								* Note in ECMA-48 the "Representation" text is in a format where 02/00 is character \x20, 04/11 is \x4B, 04/15 is \x4F, etc.
								**/
								//TODO support all these empty switch cases?
								//TODO change these hex codes to their corresponding ASCII character?
								case '\x42'://GSM - GRAPHIC SIZE MODIFICATION
									break;
								case '\x43'://GSS - GRAPHIC SIZE SELECTION
									break;
								case '\x44'://FNT - FONT SELECTION
									break;
								case '\x45'://TSS - THIN SPACE SPECIFICATION
									break;
								case '\x47'://SPI - SPACING INCREMENT
									break;
								case '\x49'://SSU - SELECT SIZE UNIT
									const newSizeUnit = Number.parseInt(parameters, 10);
									if (!Number.isNaN(newSizeUnit))
									{
										switch (newSizeUnit)
										{
											case 7:
												sizeUnit = SizeUnit.Pixel;
												break;
											case 0:
											default:
												sizeUnit = SizeUnit.Character;
												break;
										}
									}
									else
									{
										sizeUnit = SizeUnit.Character;
									}
									break;
								case '\x53'://SPD - SELECT PRESENTATION DIRECTIONS
									break;
								case '\x5A'://PEC - PRESENTATION EXPAND OR CONTRACT
									break;
								case '\x5B'://SSW - SET SPACE WIDTH
									break;
								case '\\'://SACS - SET ADDITIONAL CHARACTER SEPARATION
									break;
								case '\x5D'://SAPV - SELECT ALTERNATIVE PRESENTATION VARIANTS
									break;
								case '\x5F'://GCC - GRAPHIC CHARACTER COMBINATION
									break;
								case '\x65'://SCO - SELECT CHARACTER ORIENTATION
									break;
								case '\x66'://SRCS - SET REDUCED CHARACTER SEPARATION
									break;
								case '\x67'://SCS - SET CHARACTER SPACING
									break;
								case '\x68'://SLS - SET LINE SPACING
									//Set to a percentage of the normal line spacing
									const newLineSpacing = Number.parseFloat(parameters);
									if (!Number.isNaN(newLineSpacing))
									{
										switch (sizeUnit)
										{
											case SizeUnit.Character:
												currentLineSpacing = defaultLineSpacing * (newLineSpacing / 100);
												break;
											case SizeUnit.Pixel:
												currentLineSpacing = newLineSpacing;
												break;
											default:
												break;
										}
									}
									else
									{
										//currentLineSpacing = defaultLineSpacing;
									}
									break;
								case '\x6B'://SCP - SELECT CHARACTER PATH
									break;
								default:
									//Not supported escape code
									break;
							}
						}
						else
						{
							// Capture the full parameter, excluding the ESC and '[' and ending character
							let parameters = txt_arr.slice(start, i_temp).join('');
							///See: <see cref="CSICommands"/>
							switch (txt_arr[i_temp])
							{
							/*
							* See Table 3 in ECMA-48 ( https://www.ecma-international.org/publications-and-standards/standards/ecma-48/ )
							* Note in ECMA-48 the "Representation" text is in a format where 02/00 is character \x20, 04/11 is \x4B, 04/15 is \x4F, etc.
							**/
							//TODO add support for reversed text?
							case '\x5B'://SRS - START REVERSED STRING
								break;
							case '\x5D'://SDS - START DIRECTED STRING
								break;
							case 'm':
								// Parse the escape sequence to change style data
								ParseSGREscape(parameters, currentStyle);
								break;
							default:
								//Not supported escape code
								break;
							}
						}
						// skip to the next character
						i = i_temp;
						continue;//this continue jumps all the way back up to that for loop that iterates over the characters
					}
					break;
				}
				default:
					currentToken += c;
					break;
			}
		}
		if(currentToken.length > 0){
			tokens.push({'token':currentToken,'style':structuredClone(currentStyle)});
			currentToken = '';
		}
		return tokens;
	}
	const ColorTable = [
		'#000',   // Dark Black
		'#800000',  // Dark Red
		'#008000',   // Dark Green
		'#808000',   // Dark Yellow
		'#000080',    // Dark Blue
		'#800080',  // Dark Magenta
		'#008080',    // Dark Cyan
		'#c0c0c0',  // Dark White

		'#808080',    // Bright Black (Gray)
		'#F00',     // Bright Red
		'#0F0',    // Bright Green
		'#FF0', // Bright Yellow
		'#00F', // Bright Blue
		'#F0F', // Bright Magenta
		"#0FF", // Bright Cyan
		"#FFF", // Bright White
	];
	Object.freeze(ColorTable);
	function ParseSGREscape(parameters, currentStyle){
		let codes = parameters.split(';');
		
		for (let i = 0; i < codes.length; i++)
		{
			function GetTrueColor(color)
			{
				if (i + 1 < codes.length) {
					const colorType = parseInt(codes[i + 1], 10);
					if (!isNaN(colorType)) {
						if (colorType == 5) // 8-bit color index
						{
							if (i + 2 < codes.length) {
								const colorIndex = parseInt(codes[i + 2], 10);
								if (!isNaN(colorIndex)) {
									i += 2; // Skip the next two parameters
									const newColor = getColorFrom8BitIndex(colorIndex);
									if (newColor) {
										return newColor;
									}
								}
							}
						}
						else if (colorType == 2) // 24-bit true color
						{
							let r,g,b;
							if (
								i + 4 < codes.length &&
								!isNaN(r=parseInt(codes[i + 2], 10)) &&
								!isNaN(g=parseInt(codes[i + 3], 10)) &&
								!isNaN(b=parseInt(codes[i + 4], 10))
							) {
								i += 4; // Skip the next four parameters
								const clamp = (val) => Math.min(Math.max(val, 0), 255);
								return `rgb(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`;
							}
						}
					}
					return color;
				}
			}
			const codeValue = parseInt(codes[i]);
			if (!isNaN(codeValue))
			{
				///See: <see cref="SGRParameters"/>
				switch (codeValue)
				{
				case 0: // Reset
					delete currentStyle.FontData; // Reset to default font
					delete currentStyle.Color; // Reset to default color
					delete currentStyle.BackgroundColor; // Reset to default color
					delete currentStyle.DecorationColor; // Reset to default color
					delete currentStyle.Decoration;
					delete currentStyle.FontWeight;
					delete currentStyle.ObliqueAngle;
					break;
				case 1: // Bold
					//TODO set currentStyle.FontWeight to a value greater than DefaultFontWeight
					break;
				case 2: // Faint
					//TODO set currentStyle.FontWeight to a value less than DefaultFontWeight
					break;
				case 3: // Italic
					currentStyle.ObliqueAngle = 15;
					break;
				case 4: // Underline
					currentStyle.Decoration |= TextDecoration.Underline;
					break;
				case 5: // Slow blink
					currentStyle.BlinkDuration = TextBlinkDurationSlow;
					break;
				case 6: // Rapid blink
					currentStyle.BlinkDuration = TextBlinkDurationFast;
					break;
				case 7: // Negative image
					//TODO decide if/how to implement this
					break;
				case 8: // Obfuscate / concealed characters
					currentStyle.Decoration |= TextDecoration.Concealed;
					break;
				case 9: // Strikethrough
					currentStyle.Decoration |= TextDecoration.Strikethrough;
					break;
				
				//cases 10 to 20 are fonts
				
				case 21: // Double-underline
					currentStyle.Decoration |= TextDecoration.DoubleUnderline;
					break;
				case 22: // Neither bold nor faint
					currentStyle.FontWeight = DefaultFontWeight;
					break;
				case 23: // Not italic
					currentStyle.ObliqueAngle = 0;
					break;
				case 24: // Not underlined
					currentStyle.Decoration &= ~(TextDecoration.Underline | TextDecoration.DoubleUnderline);
					break;
				case 25: // Not blinking
					currentStyle.BlinkDuration = 0;
					break;
				case 26: // Proportional spacing
					//Not supporting this
					break;
				case 27: // Not negative image
					//TODO decide if/how to implement this
					break;
				case 28: // Revealed characters / Not obfuscated
					currentStyle.Decoration &= ~TextDecoration.Concealed;
					break;
				case 29: // Not strikethrough
					currentStyle.Decoration &= ~TextDecoration.Strikethrough;
					break;
				
				// Using Windows XP Console colors
				// Note these are the same as the first 16 colors from TryGetColorFrom8BitIndex
				// Standard colors
				case 30: currentStyle.Color = ColorTable[0]; break; // Dark Black
				case 31: currentStyle.Color = ColorTable[1]; break; // Dark Red
				case 32: currentStyle.Color = ColorTable[2]; break; // Dark Green
				case 33: currentStyle.Color = ColorTable[3]; break; // Dark Yellow
				case 34: currentStyle.Color = ColorTable[4]; break; // Dark Blue
				case 35: currentStyle.Color = ColorTable[5]; break; // Dark Magenta
				case 36: currentStyle.Color = ColorTable[6]; break; // Dark Cyan
				case 37: currentStyle.Color = ColorTable[7]; break; // Dark White
				
				case 38: // Start of 8-bit or true color
					currentStyle.Color = GetTrueColor(currentStyle.Color);
					break;
				case 39: currentStyle.Color = defaultColor; break; // Reset color
				
				// cases 40 to 49 are for backgrounds, in the same order as 30 to 39
				case 40: currentStyle.BackgroundColor = ColorTable[0]; break; // Dark Black
				case 41: currentStyle.BackgroundColor = ColorTable[1]; break; // Dark Red
				case 42: currentStyle.BackgroundColor = ColorTable[2]; break; // Dark Green
				case 43: currentStyle.BackgroundColor = ColorTable[3]; break; // Dark Yellow
				case 44: currentStyle.BackgroundColor = ColorTable[4]; break; // Dark Blue
				case 45: currentStyle.BackgroundColor = ColorTable[5]; break; // Dark Magenta
				case 46: currentStyle.BackgroundColor = ColorTable[6]; break; // Dark Cyan
				case 47: currentStyle.BackgroundColor = ColorTable[7]; break; // Dark White
				
				case 48: // Start of 8-bit or true color
					currentStyle.BackgroundColor = GetTrueColor(currentStyle.BackgroundColor);
					break;
				case 49: currentStyle.BackgroundColor = defaultBGColor; break; // Reset color
				
				case 50: // Cancel proportional spacing
					//Not supporting this
					break;
				case 51: // Framed
					currentStyle.Decoration |= TextDecoration.Framed;
					break;
				case 52: // Encircled
					currentStyle.Decoration |= TextDecoration.Encircled;
					break;
				case 53: // Overlined
					currentStyle.Decoration |= TextDecoration.Overline;
					break;
				case 54: // Not framed, not encircled
					currentStyle.Decoration &= ~(TextDecoration.Framed | TextDecoration.Encircled);
					break;
				case 55: // Not overlined
					currentStyle.Decoration &= ~TextDecoration.Overline;
					break;
				
				// cases 56 to 59 are not defined
				
				case 60: // ideogram underline or right side line
					currentStyle.Decoration |= TextDecoration.Underline;
					break;
				case 61: // ideogram double underline or double line on the right side
					currentStyle.Decoration |= TextDecoration.DoubleUnderline;
					break;
				case 62: // ideogram overline or left side line
					currentStyle.Decoration |= TextDecoration.Overline;
					break;
				case 63: // ideogram double overline or double line on the left side
					currentStyle.Decoration |= TextDecoration.DoubleOverline;
					break;
				case 64: // ideogram stress marking
					currentStyle.Decoration |= TextDecoration.StressMarking;
					break;
				case 65: // cancels the effect of the rendition aspects established by parameter values 60 to 64
					currentStyle.Decoration &= ~(TextDecoration.Underline
												 | TextDecoration.DoubleUnderline
												 | TextDecoration.Overline
												 | TextDecoration.DoubleOverline
												 | TextDecoration.StressMarking);
					break;
				
				//nothing defined for 66 to 89
				
				// Bright colors
				case 90: currentStyle.Color = ColorTable[8]; break;  // Bright Black (Gray)
				case 91: currentStyle.Color = ColorTable[9]; break;  // Bright Red
				case 92: currentStyle.Color = ColorTable[10]; break; // Bright Green
				case 93: currentStyle.Color = ColorTable[11]; break; // Bright Yellow
				case 94: currentStyle.Color = ColorTable[12]; break; // Bright Blue
				case 95: currentStyle.Color = ColorTable[13]; break; // Bright Magenta
				case 96: currentStyle.Color = ColorTable[14]; break; // Bright Cyan
				case 97: currentStyle.Color = ColorTable[15]; break; // Bright White
				
				//nothing defined for 98 to 99
				
				// cases 100 to 107 are for backgrounds, in the same order as 90 to 97
				case 100: currentStyle.Color = ColorTable[8]; break;  // Bright Black (Gray)
				case 101: currentStyle.Color = ColorTable[9]; break;  // Bright Red
				case 102: currentStyle.Color = ColorTable[10]; break; // Bright Green
				case 103: currentStyle.Color = ColorTable[11]; break; // Bright Yellow
				case 104: currentStyle.Color = ColorTable[12]; break; // Bright Blue
				case 105: currentStyle.Color = ColorTable[13]; break; // Bright Magenta
				case 106: currentStyle.Color = ColorTable[14]; break; // Bright Cyan
				case 107: currentStyle.Color = ColorTable[15]; break; // Bright White
				
				//nothing defined after 107
				
				default:
					break;
				}
			}
		}
	}
	function getColorFrom8BitIndex(index)
	{
		// Check for valid index range
		if (index < 0 || index > 255)
		{
			return null; // Indicate failure
		}
		if (index >= 0 && index < 16)
		{
			//The first 16 colors are the same as the "Standard colors" and "Bright colors" 
			return ColorTable[index];
		}
		if (index >= 16 && index < 232)
		{
			// 6x6x6 Color Cube
			const rgbIndex = index - 16;
			const r = (rgbIndex / 36) * 51; // Scale 0 to 255 for Red
			const g = ((rgbIndex / 6) % 6) * 51; // Scale 0 to 255 for Green
			const b = (rgbIndex % 6) * 51; // Scale 0 to 255 for Blue
			return `rgb(${r}, ${g}, ${b})`;
		}
		else // 232-255 are grayscale
		{
			const grayValue = ((index - 232) * 10) + 8; // Scale to 0-255
			return `rgb(${grayValue}, ${grayValue}, ${grayValue})`;
		}
	}
	return createHtmlElementsForRichText(text);
}