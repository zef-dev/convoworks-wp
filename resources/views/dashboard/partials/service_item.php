<div class="d-flex flex-wrap flex-column justify-content-between">
	<div>
		<div class="opd-product-name d-flex align-items-center">
			<div>
				<h4>
                    <?php
                        /** @var $service */
                        echo '<a href="' . admin_url() . '">' . $service->name . '</a>';
                    ?>
                </h4>
			</div>
		</div>
	</div>
</div>