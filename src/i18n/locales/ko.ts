import type { Locale } from './types';

// Korean translations. Tone matches the original wrapFlow.ts strings authored
// by the project owner. Keep dictionary keys 1:1 with en.ts.
export const ko: Locale = {
	settings: {
		palette: {
			heading: '색상 팔레트',
			desc: '강조와 이 플러그인의 컨텍스트 메뉴에 사용할 색상 팔레트를 전환합니다. 활성 팔레트에 없는 슬러그의 기존 강조도 계속 렌더링됩니다.',
			options: {
				custom: '사용자 지정',
				builtin: '내장 (테마)',
			},
		},
		colors: {
			heading: '강조 색상',
			desc: '활성 팔레트의 색상을 관리합니다. 비활성화된 색상은 우클릭 메뉴에서 숨겨지지만 노트에는 그대로 렌더링됩니다.',
			addButton: '색상 추가',
			restoreBuiltin: '내장 색상 복원',
			builtinNote: '참고: 내장 색상의 색상 값과 이름은 편집할 수 없습니다. 이 팔레트에서 편집 기능은 사용자가 추가한 색상에만 작동합니다.',
			row: {
				moveUp: '위로 이동',
				moveDown: '아래로 이동',
				enabled: '활성화',
				slug: '슬러그',
				colorPicker: '색상 선택기',
				hexValue: '헥스 값',
				hotkeyLabel: '단축키: {hotkey}',
				hotkeyNone: '단축키 미할당',
				hotkeyConfigure: '단축키 설정',
				delete: '색상 삭제',
			},
		},
		style: {
			heading: '강조 스타일',
			desc: '모든 강조에 적용되는 시각 스타일입니다.',
			options: {
				default: '기본 (솔리드)',
				lowlight: '로우라이트 (iA Writer)',
				underlined: '언더라인',
			},
		},
		readability: {
			heading: '가독성 자동 개선',
			desc: '강조 색상의 밝기를 자동으로 보정하여 가독성을 높입니다. 다크 테마에서는 너무 밝은 색상을 어둡게, 라이트 테마에서는 너무 어두운 색상을 밝게 만듭니다.',
		},
	},
	menu: {
		highlight: '강조',
		changeColor: '색상 변경',
		unhighlight: '강조 제거',
	},
	commands: {
		openPalette: '색상 팔레트 열기',
		unhighlight: '강조 제거',
	},
	notice: {
		noSelectionOrHighlight: '선택 영역이나 활성 강조가 없습니다',
	},
	modal: {
		confirm: {
			defaultOk: '확인',
			defaultCancel: '취소',
		},
		backtick: {
			title: '인라인 코드',
			message: '선택 영역이 인라인 코드(`)와 연관됩니다. 백틱을 제거하고 강조를 적용할까요?',
			confirm: '백틱 제거 후 강조',
			cancel: '취소',
		},
	},
};
