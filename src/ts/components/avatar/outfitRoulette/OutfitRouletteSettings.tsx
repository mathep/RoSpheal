import classNames from "classnames";
import { getMessage } from "src/ts/helpers/i18n/getMessage";
import { CheckIcon, MinusIcon, PlusIcon } from "./icons";
import {
	blockySignal,
	colorMatchSignal,
	maxExtrasSignal,
	minExtrasSignal,
	noTShirtSignal,
	setBlocky,
	setColorMatch,
	setMaxExtras,
	setMinExtras,
	setNoTShirt,
} from "./settings";
import { EXTRAS_MAX, EXTRAS_MIN } from "./slots";

type OptionChipProps = {
	active: boolean;
	label: string;
	title: string;
	onToggle: (value: boolean) => void;
};

function OptionChip({ active, label, title, onToggle }: OptionChipProps) {
	return (
		<button
			type="button"
			className={classNames("ror-chip", "ror-chip-option", { "is-active": active })}
			aria-pressed={active}
			title={title}
			onClick={() => onToggle(!active)}
		>
			<span className="ror-chip-icon">{active && <CheckIcon />}</span>
			<span className="ror-chip-label">{label}</span>
		</button>
	);
}

type StepperProps = {
	label: string;
	title: string;
	value: number;
	min: number;
	max: number;
	decreaseLabel: string;
	increaseLabel: string;
	onChange: (value: number) => void;
};

function Stepper({
	label,
	title,
	value,
	min,
	max,
	decreaseLabel,
	increaseLabel,
	onChange,
}: StepperProps) {
	return (
		<div className="ror-stepper" title={title}>
			<span className="ror-stepper-label">{label}</span>
			<div className="ror-stepper-control">
				<button
					type="button"
					className="ror-stepper-btn"
					aria-label={decreaseLabel}
					disabled={value <= min}
					onClick={() => onChange(Math.max(min, value - 1))}
				>
					<MinusIcon />
				</button>
				<span className="ror-stepper-value">{value}</span>
				<button
					type="button"
					className="ror-stepper-btn"
					aria-label={increaseLabel}
					disabled={value >= max}
					onClick={() => onChange(Math.min(max, value + 1))}
				>
					<PlusIcon />
				</button>
			</div>
		</div>
	);
}

// The Outfit Roulette settings — rendered as its own tab inside the Advanced
// Customization modal. Edits the shared signals in ./settings.
export default function OutfitRouletteSettings() {
	const blocky = blockySignal.value;
	const noTShirt = noTShirtSignal.value;
	const colorMatch = colorMatchSignal.value;
	const minExtras = Math.min(minExtrasSignal.value, maxExtrasSignal.value);
	const maxExtras = maxExtrasSignal.value;

	return (
		<div className="roseal-outfit-roulette roseal-outfit-roulette-settings">
			<p className="ror-settings-intro">
				{getMessage("avatar.outfitRoulette.settingsDescription")}
			</p>

			<div className="ror-section">
				<span className="ror-section-label">
					{getMessage("avatar.outfitRoulette.optionsLabel")}
				</span>
				<div className="ror-chip-row">
					<OptionChip
						active={colorMatch}
						label={getMessage("avatar.outfitRoulette.colorMatchLabel")}
						title={getMessage("avatar.outfitRoulette.colorMatchTooltip")}
						onToggle={setColorMatch}
					/>
					<OptionChip
						active={blocky}
						label={getMessage("avatar.outfitRoulette.blockyLabel")}
						title={getMessage("avatar.outfitRoulette.blockyTooltip")}
						onToggle={setBlocky}
					/>
					<OptionChip
						active={noTShirt}
						label={getMessage("avatar.outfitRoulette.noTShirtLabel")}
						title={getMessage("avatar.outfitRoulette.noTShirtTooltip")}
						onToggle={setNoTShirt}
					/>
				</div>
			</div>

			<div className="ror-section">
				<span className="ror-section-label">
					{getMessage("avatar.outfitRoulette.countLabel")}
				</span>
				<div className="ror-steppers">
					<Stepper
						label={getMessage("avatar.outfitRoulette.minItemsLabel")}
						title={getMessage("avatar.outfitRoulette.minItemsTooltip")}
						value={minExtras}
						min={EXTRAS_MIN}
						max={maxExtras}
						decreaseLabel={getMessage("avatar.outfitRoulette.decrease")}
						increaseLabel={getMessage("avatar.outfitRoulette.increase")}
						onChange={setMinExtras}
					/>
					<Stepper
						label={getMessage("avatar.outfitRoulette.maxItemsLabel")}
						title={getMessage("avatar.outfitRoulette.maxItemsTooltip")}
						value={maxExtras}
						min={minExtras}
						max={EXTRAS_MAX}
						decreaseLabel={getMessage("avatar.outfitRoulette.decrease")}
						increaseLabel={getMessage("avatar.outfitRoulette.increase")}
						onChange={setMaxExtras}
					/>
				</div>
			</div>
		</div>
	);
}
