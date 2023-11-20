<?php
if (!defined('ABSPATH')) {
    exit;
}

$is_connected_to_amazon = $is_connected_to_amazon ?? false;
?>

<div class="opd-dashboard" style="margin-left: -20px; <?php echo CONVOWP_LOCAL ? 'border-top: 3px solid orange;' : '' ?>">
    <?php Convo\partial('partials/navigation'); ?>

    <div class="opd-dashboard-settings p-4">
        <div class="text-center">
            <h1>Welcome to Convoworks WP</h1>
        </div>

        <div class="row row-cols-1 row-cols-md-1">
            <div class="col-sm-12 col-md-6 d-flex justify-content-center mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Amazon Alexa</h5>
                        <p class="card-text"><?php echo $is_connected_to_amazon ? "You can always edit your connection to Amazon if you want to use another Amazon Developer Account." : "In order to be able to propagate your services to Amazon Alexa, you'll have to connect to Amazon Alexa with an Amazon Developer Account." ?></p>
                        <a href="<?php echo admin_url('admin.php?page=convo-settings&convo-settings-group=amazon') ?>" class="btn <?php echo $is_connected_to_amazon ? "btn-success" : "btn-primary" ?>"><?php echo $is_connected_to_amazon ? "Edit Your Amazon Connection" : "Connect to Amazon Now" ?></a>
                        <a href="https://convoworks.com/docs/publishers/platforms-configuration/amazon-alexa/" target="_blank" class="btn btn-outline-secondary">Read the full guide</a>
                    </div>
                </div>
            </div>
            <div class="col-sm-12 col-md-6 d-flex justify-content-center mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">Create Your First Service</h5>
                        <p class="card-text">Convoworks makes it easy to create conversational services in WordPress. You can read our guide on how to create your first form or start creating your first service on your own.</p>
                        <a href="<?php echo admin_url('admin.php?page=convo-plugin#!/add-new-service') ?>" class="btn btn-primary">Create your first service</a>
                        <a href="https://convoworks.com/docs/publishers/tutorial-getting-started/" target="_blank" class="btn btn-outline-secondary">Read the full guide</a>
                    </div>
                </div>
            </div>
        </div>
        <div class="row row-cols-1 row-cols-md-1">
            <div class="card text-center">
                <div class="card-header">
                    Video Tutorials
                </div>
                <div class="card-body">
                    <h5 class="card-title">Convoworks Basics</h5>
                    <p class="card-text">In this playlist we will cover basic usage, explain some general conversational concepts and through that process we will create a simple number guessing game.</p>
                </div>
            </div>
        </div>
        <div class="row row-cols-1 row-cols-md-1">
            <div class="col-md-6 d-flex justify-content-md-end justify-content-sm-center mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title" style="min-height: 75px;">Episode 1: Intro and GUI walkthrough</h5>
                        <p class="card-text" style="min-height: 125px;">Check out this easy to follow, short instructional video on what to do for your first service.</p>
                        <iframe width="100%" height="230" src="https://www.youtube.com/embed/5WiEjO9bPqY" title="Intro and GUI walkthrough" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                </div>
            </div>
            <div class="col-md-6 d-flex justify-content-md-start justify-content-sm-center mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title" style="min-height: 75px;">Episode 2: Connect to Amazon and create your first Alexa skill</h5>
                        <p class="card-text" style="min-height: 125px;">Now that you're up to speed on how to use the GUI, find out how to connect to Amazon and publish your skill there.</p>
                        <iframe width="100%" height="230" src="https://www.youtube.com/embed/7lx5_ZqazvA" title="Connect to Amazon and create your first Alexa skill" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                </div>
            </div>
        </div>
        <div class="row row-cols-1 row-cols-md-1">
            <div class="col-md-6 d-flex justify-content-md-end justify-content-sm-center mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title" style="min-height: 75px;">Episode 3: Conversation Management Basics</h5>
                        <p class="card-text" style="min-height: 125px;">Dive into slightly more advanced, general conversation building topics that you can apply to any skill.</p>
                        <iframe width="100%" height="230" src="https://www.youtube.com/embed/TFLj49lDAG4" title="Conversation Management Basics" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                </div>
            </div>
            <div class="col-md-6 d-flex justify-content-md-start justify-content-sm-center mb-4">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title" style="min-height: 75px;">Episode 4: Number guessing game</h5>
                        <p class="card-text" style="min-height: 125px;">Follow this concise tutorial from start to finish to get an intermediate-complexity, number guessing game, from planning to playing.</p>
                        <iframe width="100%" height="230" src="https://www.youtube.com/embed/GcFyv3upze4" title="Number guessing game" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>